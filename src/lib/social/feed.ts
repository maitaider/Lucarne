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
    stake_cents: number;
    payout_cents: number;
    points: number;
    payload: unknown;
    home_team: string | null;
    away_team: string | null;
    match_id: string | null;
    match_status: string | null;
  };
};

/**
 * Returns the recent activity feed for a league:
 * - When a bet is placed and validated (so friends can see picks AFTER kickoff)
 * - When a bet settles (won/lost)
 * - Sorted newest first
 */
export async function listLeagueFeed(
  leagueId: string,
  limit = 25,
): Promise<FeedActivity[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await getSupabaseServer();

  // Pull bets in this league. RLS will hide friends' picks before kickoff.
  const { data, error } = await supabase
    .from("bets")
    .select(
      `
      id, bet_type, status, result, points, stake_cents, payout_cents,
      payload, submitted_at, locked_at, user_id,
      author:profiles!bets_user_id_fkey(username, display_name),
      match:match_id(
        id, status, kickoff_at,
        home_team:home_team_id(name_fr, name_en),
        away_team:away_team_id(name_fr, name_en)
      )
    `,
    )
    .eq("league_id", leagueId)
    .in("status", ["validated", "settled"])
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const activities: FeedActivity[] = [];
  for (const row of data) {
    const author = pickOne(
      row.author as
        | { username: string; display_name: string | null }
        | { username: string; display_name: string | null }[]
        | null,
    );
    const match = pickOne(row.match as MatchEmbed | MatchEmbed[] | null);
    const homeTeam = match ? pickOne(match.home_team) : null;
    const awayTeam = match ? pickOne(match.away_team) : null;

    const bet = {
      id: row.id,
      bet_type: row.bet_type,
      stake_cents: row.stake_cents,
      payout_cents: row.payout_cents,
      points: row.points,
      payload: row.payload,
      home_team: homeTeam?.name_fr ?? null,
      away_team: awayTeam?.name_fr ?? null,
      match_id: match?.id ?? null,
      match_status: match?.status ?? null,
    };

    if (row.status === "settled") {
      activities.push({
        id: `${row.id}-settled`,
        kind: row.result === "won" ? "bet_won" : "bet_lost",
        created_at: row.submitted_at,
        user: {
          username: author?.username ?? "?",
          display_name: author?.display_name ?? null,
        },
        bet,
      });
    } else {
      activities.push({
        id: row.id,
        kind: "bet_placed",
        created_at: row.submitted_at,
        user: {
          username: author?.username ?? "?",
          display_name: author?.display_name ?? null,
        },
        bet,
      });
    }
  }
  return activities;
}

type MatchEmbed = {
  id: string;
  status: string;
  kickoff_at: string;
  home_team:
    | { name_fr: string; name_en: string }
    | { name_fr: string; name_en: string }[]
    | null;
  away_team:
    | { name_fr: string; name_en: string }
    | { name_fr: string; name_en: string }[]
    | null;
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
