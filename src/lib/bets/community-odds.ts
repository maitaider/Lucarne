import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type CommunityOdds = {
  /** % of match_winner bets predicting home win (0-100) */
  home: number;
  /** % predicting draw */
  draw: number;
  /** % predicting away win */
  away: number;
  /** Total community bets counted */
  total: number;
};

const DEFAULT: CommunityOdds = { home: 38, draw: 24, away: 38, total: 0 };

/**
 * Returns the community consensus (% home / draw / away) per match, over ALL
 * active predictions — not just the caller's.
 *
 * Goes through the `match_consensus` SECURITY DEFINER RPC for two reasons:
 *   1. The anti-copy RLS on `bets` would otherwise hide other players' bets
 *      from a direct query (the caller would only "see" their own).
 *   2. Since the score-only pivot, players post `exact_score`, not
 *      `match_winner`, so the winner is derived from the score server-side.
 * The RPC returns only aggregate counts (no individual pick leaks).
 *
 * Matches with no/insufficient data keep the balanced `DEFAULT` (total 0); the
 * UI decides the minimum sample before showing a consensus.
 */
export async function getCommunityOdds(
  matchIds: string[],
): Promise<Map<string, CommunityOdds>> {
  const result = new Map<string, CommunityOdds>();
  for (const id of matchIds) result.set(id, { ...DEFAULT });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || matchIds.length === 0) {
    return result;
  }

  const supabase = await getSupabaseServer();
  // One scalar call per match. match_consensus takes a single uuid (not an
  // array) because this PostgREST drops array-parameter functions from its REST
  // schema cache (they 404 while scalar-param siblings are exposed fine).
  await Promise.all(
    matchIds.map(async (id) => {
      const { data, error } = await supabase.rpc("match_consensus", {
        p_match_id: id,
      });
      if (error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      const total = row?.total ?? 0;
      if (!row || total === 0) return;
      result.set(id, {
        home: Math.round(((row.home ?? 0) / total) * 100),
        draw: Math.round(((row.draw ?? 0) / total) * 100),
        away: Math.round(((row.away ?? 0) / total) * 100),
        total,
      });
    }),
  );

  return result;
}

/**
 * Converts a community % share into a simulated decimal odds value.
 * Used purely as visual indicator on the dashboard prediction cards.
 * A 50% share → 1.85 odds, 10% → 3.50 odds, etc.
 */
export function shareToOdds(sharePct: number): number {
  const share = Math.max(Math.min(sharePct, 95), 5) / 100;
  // Implied odds with 5% house margin
  const odds = 0.95 / share;
  return Math.round(odds * 100) / 100;
}
