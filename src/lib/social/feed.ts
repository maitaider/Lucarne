import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type FeedActivity = {
  id: string;
  kind: "bet_placed" | "bet_won" | "bet_lost" | "match_finished";
  created_at: string;
  user: { username: string; display_name: string | null };
  bet?: {
    id: string;
    bet_type: string;
    points: number;
    payload: unknown;
    home_team: string | null;
    away_team: string | null;
    match_id: string | null;
    match_status: string | null;
  };
};

type MatchEmbed = {
  id: string;
  status: string;
  kickoff_at: string;
  home_team: { name_fr: string; name_en: string } | null;
  away_team: { name_fr: string; name_en: string } | null;
};

/**
 * Returns the recent activity feed for a league:
 * - When a bet is placed and validated (so friends can see picks AFTER kickoff)
 * - When a bet settles (won/lost)
 * - Sorted newest first
 *
 * Implementation note: bets.match_id is a cross-schema FK to ref.matches,
 * which PostgREST can't always follow via embed syntax. We split this into
 * two queries (feed RPC first, matches by id second) for stability.
 *
 * The feed comes from the league_feed SECURITY DEFINER RPC: it links members
 * via league_members (bets.league_id is usually null) and applies the
 * kickoff-reveal rule server-side, so co-members' locked picks surface without
 * leaking pre-kickoff picks.
 */
export async function listLeagueFeed(
  leagueId: string,
  limit = 25,
): Promise<FeedActivity[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await getSupabaseServer();

  // 1. Pull recent member bets via the definer RPC (reveal rule applied inside).
  const { data: betsData, error: betsErr } = await supabase.rpc("league_feed", {
    p_league_id: leagueId,
    p_limit: limit,
  });

  if (betsErr || !betsData) return [];

  // 2. Hydrate matches by id (cross-schema, so query ref directly).
  const matchIds = Array.from(
    new Set(betsData.map((b) => b.match_id).filter((id): id is string => !!id)),
  );
  const matchesById = new Map<string, MatchEmbed>();
  if (matchIds.length > 0) {
    const { data: matchesData } = await supabase
      .schema("ref")
      .from("matches")
      .select(
        `
        id, status, kickoff_at,
        home_team:teams!matches_home_team_id_fkey(name_fr, name_en),
        away_team:teams!matches_away_team_id_fkey(name_fr, name_en)
      `,
      )
      .in("id", matchIds);
    for (const m of matchesData ?? []) {
      matchesById.set(m.id, {
        id: m.id,
        status: m.status,
        kickoff_at: m.kickoff_at,
        home_team: pickOne(
          m.home_team as
            | { name_fr: string; name_en: string }
            | { name_fr: string; name_en: string }[]
            | null,
        ),
        away_team: pickOne(
          m.away_team as
            | { name_fr: string; name_en: string }
            | { name_fr: string; name_en: string }[]
            | null,
        ),
      });
    }
  }

  const activities: FeedActivity[] = [];
  for (const row of betsData) {
    const match = row.match_id ? (matchesById.get(row.match_id) ?? null) : null;

    const bet = {
      id: row.id,
      bet_type: row.bet_type,
      points: row.points,
      payload: row.payload,
      home_team: match?.home_team?.name_fr ?? null,
      away_team: match?.away_team?.name_fr ?? null,
      match_id: match?.id ?? null,
      match_status: match?.status ?? null,
    };

    const user = {
      username: row.username ?? "?",
      display_name: row.display_name ?? null,
    };

    if (row.status === "settled") {
      activities.push({
        id: `${row.id}-settled`,
        kind: row.result === "won" ? "bet_won" : "bet_lost",
        created_at: row.submitted_at,
        user,
        bet,
      });
    } else {
      activities.push({
        id: row.id,
        kind: "bet_placed",
        created_at: row.submitted_at,
        user,
        bet,
      });
    }
  }
  return activities;
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
