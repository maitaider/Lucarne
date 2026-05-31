import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Public player profile (intra-league). Powered by the `public_profile`
 * SECURITY DEFINER RPC, which only returns a row when the caller is the player
 * themselves, an admin, or a co-member of one of their leagues — and never
 * exposes email or any money column. A null return means "not found OR not
 * allowed", and both should render a 404 (a non-member can't even probe a
 * username's existence).
 */
export type PublicProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  wins: number;
  losses: number;
  settled_count: number;
  bets_count: number;
  rank: number;
};

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("public_profile", {
    p_username: username,
  });
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    user_id: r.user_id ?? "",
    username: r.username ?? "",
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    role: r.role ?? "player",
    total_points: r.total_points ?? 0,
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    settled_count: r.settled_count ?? 0,
    bets_count: r.bets_count ?? 0,
    rank: r.rank ?? 0,
  };
}

export type ProfileTeamSide = {
  name_fr: string | null;
  name_en: string | null;
  iso: string | null;
  fifa: string | null;
  score: number | null;
};

export type ProfileBet = {
  bet_id: string;
  match_id: string | null;
  kickoff_at: string | null;
  match_status: string | null;
  bet_type: string;
  result: string | null;
  points: number;
  payload: unknown;
  home: ProfileTeamSide;
  away: ProfileTeamSide;
};

/**
 * The player's most recent SETTLED predictions (same visibility gate). Only
 * settled bets are returned, so the match is already finished — no pre-kickoff
 * pick leak. Team names/flags come pre-resolved from the RPC.
 */
export async function getProfileRecentBets(
  username: string,
  limit = 8,
): Promise<ProfileBet[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("profile_recent_bets", {
    p_username: username,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data.map((r) => ({
    bet_id: r.bet_id ?? "",
    match_id: r.match_id,
    kickoff_at: r.kickoff_at,
    match_status: r.match_status,
    bet_type: r.bet_type ?? "",
    result: r.result,
    points: r.points ?? 0,
    payload: r.payload,
    home: {
      name_fr: r.home_name_fr,
      name_en: r.home_name_en,
      iso: r.home_iso,
      fifa: r.home_fifa,
      score: r.home_score,
    },
    away: {
      name_fr: r.away_name_fr,
      name_en: r.away_name_en,
      iso: r.away_iso,
      fifa: r.away_fifa,
      score: r.away_score,
    },
  }));
}
