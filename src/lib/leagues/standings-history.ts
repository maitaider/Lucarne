import "server-only";
import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

export type StandingDelta = {
  /** prev_rank − current_rank (positive = climbed). null = no history yet. */
  rankDelta: number | null;
  points24h: number;
  maxPossible: number;
};

/** user_id → rank/points delta vs the latest snapshot. Cached per request. */
export const getStandingsDeltas = cache(
  async (): Promise<Map<string, StandingDelta>> => {
    const map = new Map<string, StandingDelta>();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return map;
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.rpc("standings_deltas");
    if (error || !data) return map;
    for (const r of data) {
      map.set(r.user_id, {
        rankDelta: r.rank_delta,
        points24h: r.points_24h,
        maxPossible: r.max_possible,
      });
    }
    return map;
  },
);

export type DailyMovement = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
};
export type DailyMovements = {
  climb: DailyMovement | null;
  drop: DailyMovement | null;
  scorer: DailyMovement | null;
};

/** Biggest climb / drop / best scorer over the last 24h. Cached per request. */
export const getDailyMovements = cache(async (): Promise<DailyMovements> => {
  const out: DailyMovements = { climb: null, drop: null, scorer: null };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return out;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("daily_movements");
  if (error || !data) return out;
  for (const r of data) {
    const m: DailyMovement = {
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      value: r.value,
    };
    if (r.kind === "climb") out.climb = m;
    else if (r.kind === "drop") out.drop = m;
    else if (r.kind === "scorer") out.scorer = m;
  }
  return out;
});

export type PointsHistoryPoint = { date: string; points: number };

/** Cumulative points per day for a player (their progression chart). */
export async function getUserPointsHistory(
  username: string,
): Promise<PointsHistoryPoint[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("user_points_history", {
    p_username: username,
  });
  if (error || !data) return [];
  return data.map((r) => ({ date: r.snapshot_date, points: r.points }));
}
