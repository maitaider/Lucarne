import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type PlayerAchievements = {
  total_points: number;
  settled_count: number;
  won_count: number;
  exact_count: number;
  scorer_count: number;
  current_streak: number;
  best_streak: number;
};

/**
 * Aggregate badge/streak stats for a player, computed server-side from their
 * settled bets (via the `player_achievements` SECURITY DEFINER RPC — only
 * counters/points, no raw bets, so no anti-copy leak).
 */
export async function getPlayerAchievements(
  username: string,
): Promise<PlayerAchievements | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("player_achievements", {
    p_username: username,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return row ? (row as PlayerAchievements) : null;
}
