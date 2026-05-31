import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Public prediction-share data. Powered by the `shared_prediction` SECURITY
 * DEFINER RPC, which only returns a row once the match has kicked off (anti-copy)
 * and never exposes email/money. Read with a cookieless anon client — the share
 * page and its OG image are PUBLIC (no session), so they must not depend on
 * request cookies.
 */
export type SharedPrediction = {
  bet_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bet_type: string;
  result: string | null;
  points: number;
  payload: unknown;
  status: string;
  kickoff_at: string | null;
  match_status: string | null;
  home: SharedTeam;
  away: SharedTeam;
};

type SharedTeam = {
  name_fr: string | null;
  name_en: string | null;
  iso: string | null;
  score: number | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSharedPrediction(
  betId: string,
): Promise<SharedPrediction | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !UUID_RE.test(betId)) return null;

  const supabase = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("shared_prediction", {
    p_bet_id: betId,
  });
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    bet_id: r.bet_id ?? betId,
    username: r.username ?? "",
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    bet_type: r.bet_type ?? "",
    result: r.result,
    points: r.points ?? 0,
    payload: r.payload,
    status: r.status ?? "",
    kickoff_at: r.kickoff_at,
    match_status: r.match_status,
    home: {
      name_fr: r.home_name_fr,
      name_en: r.home_name_en,
      iso: r.home_iso,
      score: r.home_score,
    },
    away: {
      name_fr: r.away_name_fr,
      name_en: r.away_name_en,
      iso: r.away_iso,
      score: r.away_score,
    },
  };
}
