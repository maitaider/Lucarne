import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

type StandingRow = {
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  total_points: number | null;
  wins: number | null;
  losses: number | null;
  bets_count: number | null;
  rank: number | null;
};

function toStanding(r: StandingRow): StandingEntry {
  return {
    user_id: r.user_id ?? "",
    username: r.username ?? "",
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    role: r.role ?? "player",
    total_points: r.total_points ?? 0,
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    bets_count: r.bets_count ?? 0,
    rank: r.rank ?? 0,
  };
}

export type LeagueListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  owner_id: string;
  member_limit: number | null;
  allows_real_money: boolean;
  member_count: number;
};

export type StandingEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  wins: number;
  losses: number;
  bets_count: number;
  rank: number;
};

export type Invitation = {
  id: string;
  code: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  created_at: string;
};

export async function listMyLeagues(): Promise<LeagueListItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("leagues")
    .select(
      `
      id, name, slug, description, visibility, owner_id, member_limit, allows_real_money,
      members:league_members(count)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[leagues:listMyLeagues]", error);
    return [];
  }

  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    description: l.description,
    visibility: l.visibility,
    owner_id: l.owner_id,
    member_limit: l.member_limit,
    allows_real_money: l.allows_real_money,
    member_count: l.members[0]?.count ?? 0,
  }));
}

export type LeagueWithMembers = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  owner_id: string;
  member_limit: number | null;
  allows_real_money: boolean;
  members: { user_id: string; role: string; joined_at: string; status: string }[];
};

export async function getLeagueBySlug(slug: string): Promise<LeagueWithMembers | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("leagues")
    .select("*, members:league_members(user_id, role, joined_at, status)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    visibility: data.visibility,
    owner_id: data.owner_id,
    member_limit: data.member_limit,
    allows_real_money: data.allows_real_money,
    members: data.members.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      status: m.status,
    })),
  };
}

export async function getLeagueStandings(
  leagueId: string,
): Promise<StandingEntry[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("mv_league_standings")
    .select("*")
    .eq("league_id", leagueId)
    .order("rank", { ascending: true });
  if (error) {
    console.error("[leagues:getLeagueStandings]", error);
    return [];
  }
  return (data ?? []).map(toStanding);
}

export async function getGlobalStandings(limit = 100): Promise<StandingEntry[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("mv_global_standings")
    .select("*")
    .order("rank", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(toStanding);
}

export async function listLeagueInvitations(leagueId: string): Promise<Invitation[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("invitations")
    .select("id, code, expires_at, max_uses, uses, created_at")
    .eq("league_id", leagueId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Invitation[];
}
