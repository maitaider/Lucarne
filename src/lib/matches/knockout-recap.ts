import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { MatchStage } from "@/lib/matches/shared";

export type RecapTeam = {
  name_fr: string | null;
  name_en: string | null;
  iso: string | null;
  ph: string | null;
};

export type RecapMatch = {
  match_number: number | null;
  stage: MatchStage;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: RecapTeam;
  away: RecapTeam;
};

export type RecapLeader = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
};

export type RecapDay = {
  day: string; // YYYY-MM-DD (America/Toronto)
  matches: RecapMatch[];
  leaders: RecapLeader[];
};

/**
 * Daily knockout recap: per match-day, the fixtures + the leaderboard of points
 * earned that day (from per-match score predictions). Aggregates only — the RPC
 * is SECURITY DEFINER so it never leaks another player's pick payload.
 */
export async function getKnockoutDailyRecap(): Promise<RecapDay[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  // RPC added after the last `db:types` generation, so it isn't in the typed
  // client surface yet — cast through unknown. Runtime shape matches RecapDay[].
  const { data, error } = await supabase.rpc(
    "knockout_daily_recap" as never,
  );
  if (error || !data) {
    if (error) console.error("[matches:getKnockoutDailyRecap]", error);
    return [];
  }
  return (data as unknown as RecapDay[]) ?? [];
}
