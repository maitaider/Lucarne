import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type BetStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "validated"
  | "settled"
  | "rejected"
  | "refunded";

export type BetResult = "won" | "lost" | "push" | "void";

export type BetListItem = {
  id: string;
  bet_type: string;
  payload: unknown;
  stake_cents: number;
  status: BetStatus;
  result: BetResult | null;
  payout_cents: number;
  points: number;
  submitted_at: string;
  match: {
    id: string;
    stage: string;
    kickoff_at: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: {
      fifa_code: string;
      iso_code: string | null;
      name_fr: string;
      name_en: string;
      flag_emoji: string | null;
    } | null;
    away_team: {
      fifa_code: string;
      iso_code: string | null;
      name_fr: string;
      name_en: string;
      flag_emoji: string | null;
    } | null;
  } | null;
};

type TeamSummary = {
  id: string;
  fifa_code: string;
  iso_code: string | null;
  name_fr: string;
  name_en: string;
  flag_emoji: string | null;
};

/**
 * Fetch the current user's bets and join them with the related ref.matches
 * row. Cross-schema FK embeds (public.bets → ref.matches) are not reliably
 * picked up by PostgREST, so we run TWO simple queries and merge in memory:
 *   1. SELECT * FROM bets WHERE user_id = me
 *   2. SELECT match + teams FROM ref.matches WHERE id IN (...)
 * Both queries respect RLS.
 */
export async function listMyBets(): Promise<BetListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: bets, error: betsError } = await supabase
    .from("bets")
    .select(
      "id, bet_type, payload, stake_cents, status, result, payout_cents, points, submitted_at, match_id",
    )
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (betsError) {
    console.error(
      "[bets:listMyBets] bets fetch failed",
      betsError.message,
      betsError.code,
    );
    return [];
  }
  if (!bets || bets.length === 0) return [];

  const matchIds = Array.from(
    new Set(
      bets
        .map((b) => b.match_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  type MatchRow = {
    id: string;
    stage: string;
    kickoff_at: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: TeamSummary | TeamSummary[] | null;
    away_team: TeamSummary | TeamSummary[] | null;
  };

  let matchById = new Map<string, MatchRow>();
  if (matchIds.length > 0) {
    const { data: matches, error: matchesError } = await supabase
      .schema("ref")
      .from("matches")
      .select(
        `
        id, stage, kickoff_at, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji),
        away_team:teams!matches_away_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji)
        `,
      )
      .in("id", matchIds);
    if (matchesError) {
      console.error(
        "[bets:listMyBets] matches fetch failed",
        matchesError.message,
        matchesError.code,
      );
    } else if (matches) {
      matchById = new Map(
        matches.map((m) => [m.id, m as unknown as MatchRow]),
      );
    }
  }

  return bets.map((b) => {
    const m = b.match_id ? matchById.get(b.match_id) : null;
    const home = m ? pickOne(m.home_team) : null;
    const away = m ? pickOne(m.away_team) : null;
    return {
      id: b.id,
      bet_type: b.bet_type,
      payload: b.payload,
      stake_cents: b.stake_cents,
      status: b.status as BetStatus,
      result: b.result as BetResult | null,
      payout_cents: b.payout_cents,
      points: b.points,
      submitted_at: b.submitted_at,
      match: m
        ? {
            id: m.id,
            stage: m.stage,
            kickoff_at: m.kickoff_at,
            status: m.status,
            home_score: m.home_score,
            away_score: m.away_score,
            home_team: home,
            away_team: away,
          }
        : null,
    };
  });
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
