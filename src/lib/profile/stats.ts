import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type UserStats = {
  total_bets: number;
  settled_bets: number;
  wins: number;
  losses: number;
  pushes: number;
  total_points: number;
  total_staked_cents: number;
  total_payout_cents: number;
  win_rate: number; // 0-1
  net_cents: number;
};

const EMPTY: UserStats = {
  total_bets: 0,
  settled_bets: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  total_points: 0,
  total_staked_cents: 0,
  total_payout_cents: 0,
  win_rate: 0,
  net_cents: 0,
};

/**
 * Aggregate stats across all of the current user's bets.
 * Returns zeros if no session or no bets.
 */
export async function getMyStats(): Promise<UserStats> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return EMPTY;

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data, error } = await supabase
    .from("bets")
    .select("status, result, points, stake_cents, payout_cents")
    .eq("user_id", user.id);

  if (error || !data) return EMPTY;

  const stats = { ...EMPTY };
  stats.total_bets = data.length;

  for (const b of data) {
    stats.total_staked_cents += b.stake_cents;
    stats.total_payout_cents += b.payout_cents;
    stats.total_points += b.points;
    if (b.status === "settled") {
      stats.settled_bets += 1;
      if (b.result === "won") stats.wins += 1;
      else if (b.result === "lost") stats.losses += 1;
      else if (b.result === "push") stats.pushes += 1;
    }
  }

  stats.win_rate =
    stats.settled_bets > 0 ? stats.wins / stats.settled_bets : 0;
  stats.net_cents = stats.total_payout_cents - stats.total_staked_cents;

  return stats;
}
