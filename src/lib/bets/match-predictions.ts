import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type MatchPrediction = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  pred_home: number;
  pred_away: number;
  status: string;
  result: string | null;
  points: number;
};

/**
 * Every player's SCORE prediction for a match, at all times. The
 * `match_predictions` RPC no longer gates on kickoff (anti-cheat reveal
 * dropped, 2026-06-10 — see migration 20260608100000); it just requires an
 * authenticated caller. Returns [] when no one predicted.
 */
export async function getMatchPredictions(
  matchId: string,
): Promise<MatchPrediction[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("match_predictions", {
    p_match_id: matchId,
  });
  if (error || !data) return [];
  return data.map((r) => ({
    user_id: r.user_id ?? "",
    username: r.username ?? "",
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    role: r.role ?? "player",
    pred_home: r.pred_home ?? 0,
    pred_away: r.pred_away ?? 0,
    status: r.status ?? "",
    result: r.result,
    points: r.points ?? 0,
  }));
}
