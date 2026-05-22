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
 * Returns the community consensus per match for `match_winner` bets.
 * Falls back to balanced defaults when no community data exists.
 *
 * Note: this aggregates ALL validated/settled bets, not just current user's.
 * Used for the dashboard PredictionCards to show "what the community thinks".
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
  const { data, error } = await supabase
    .from("bets")
    .select("match_id, payload")
    .eq("bet_type", "match_winner")
    .in("status", ["validated", "settled", "paid"])
    .in("match_id", matchIds);

  if (error || !data) return result;

  type Tally = { home: number; draw: number; away: number; total: number };
  const tally = new Map<string, Tally>();

  for (const row of data) {
    if (!row.match_id) continue;
    const payload = row.payload as { winner?: string } | null;
    if (!payload?.winner) continue;
    const t = tally.get(row.match_id) ?? { home: 0, draw: 0, away: 0, total: 0 };
    if (payload.winner === "home") t.home += 1;
    else if (payload.winner === "draw") t.draw += 1;
    else if (payload.winner === "away") t.away += 1;
    t.total += 1;
    tally.set(row.match_id, t);
  }

  for (const [matchId, t] of tally.entries()) {
    if (t.total === 0) continue;
    result.set(matchId, {
      home: Math.round((t.home / t.total) * 100),
      draw: Math.round((t.draw / t.total) * 100),
      away: Math.round((t.away / t.total) * 100),
      total: t.total,
    });
  }

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
