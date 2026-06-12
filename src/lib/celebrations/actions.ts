"use server";

import { getSupabaseServer } from "@/lib/supabase/server";

export type Celebration = {
  betId: string;
  matchId: string;
  points: number;
  isExact: boolean;
  homeFr: string;
  homeEn: string;
  homeCode: string;
  awayFr: string;
  awayEn: string;
  awayCode: string;
};

/**
 * Returns the caller's most celebration-worthy un-celebrated win (exact score
 * first) and marks the whole un-celebrated batch as seen — atomically, in the
 * `claim_celebration` RPC. So calling this twice (refresh / new session) returns
 * null the second time → the celebration never replays.
 */
export async function claimCelebration(): Promise<Celebration | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("claim_celebration");
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    betId: r.bet_id,
    matchId: r.match_id,
    points: r.points,
    isExact: r.is_exact,
    homeFr: r.home_fr,
    homeEn: r.home_en,
    homeCode: r.home_code,
    awayFr: r.away_fr,
    awayEn: r.away_en,
    awayCode: r.away_code,
  };
}
