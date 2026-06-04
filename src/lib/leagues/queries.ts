import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * A `league_members` row's embedded `profiles` join is non-null only for an
 * active member: `profiles_select_all` RLS is `using (deleted_at is null)`, so
 * an archived (soft-deleted) user's profile is hidden → the embed comes back
 * null. We also defend against an env that exposes `deleted_at`. This mirrors
 * the standings (`mv_league_standings` INNER JOINs `profiles … deleted_at is
 * null`) so member counts and the leaderboard agree.
 */
function isActiveMemberEmbed(m: { profile: unknown }): boolean {
  const raw = m.profile;
  const p = (Array.isArray(raw) ? raw[0] : raw) as
    | { deleted_at?: string | null }
    | null
    | undefined;
  return !!p && (p.deleted_at ?? null) === null;
}

function countActiveMembers(members: { profile: unknown }[]): number {
  return members.filter(isActiveMemberEmbed).length;
}

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
      members:league_members(user_id, profile:profiles(id, deleted_at))
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
    // Count only members with an active (non-archived) profile — matches the
    // standings, which INNER JOIN `profiles … deleted_at is null`. A soft-deleted
    // (archived) user keeps their league_members row but must not be counted.
    member_count: countActiveMembers(l.members),
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
    .select(
      "*, members:league_members(user_id, role, joined_at, status, profile:profiles(id, deleted_at))",
    )
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
    // Drop archived (soft-deleted) members so the count + roster match the
    // standings — an archived user keeps their row but is no longer a member.
    members: data.members.filter(isActiveMemberEmbed).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      status: m.status,
    })),
  };
}

/**
 * Overlay identity columns (display_name, avatar_url, role) read live from
 * `profiles` onto the standings rows.
 *
 * In the canonical schema the `mv_*_standings` relations are plain VIEWS (see
 * migration `20260530220000`, which dropped the original materialized views and
 * recreated them as `create view`), so they already select `profiles.avatar_url`
 * live. This overlay keeps the leaderboard correct even in an environment whose
 * DB drifted and still serves these as a STALE materialized view (the CLAUDE.md
 * "leçons de prod" #1 failure mode) — a freshly uploaded avatar then still shows
 * up. RLS `profiles_select_all` lets any authenticated user read non-deleted
 * profiles; cost is one indexed `id in (...)` lookup. Rows with no matching
 * profile keep their original values.
 */
async function withLiveIdentities(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  rows: StandingEntry[],
): Promise<StandingEntry[]> {
  const ids = rows.map((r) => r.user_id).filter(Boolean);
  if (ids.length === 0) return rows;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role")
    .in("id", ids);
  if (!data || data.length === 0) return rows;
  const live = new Map(data.map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = live.get(r.user_id);
    if (!p) return r;
    return {
      ...r,
      username: p.username ?? r.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      role: p.role ?? r.role,
    };
  });
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
  return withLiveIdentities(supabase, (data ?? []).map(toStanding));
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
  return withLiveIdentities(supabase, (data ?? []).map(toStanding));
}

/**
 * Global standings counting only points earned on matches of a given phase
 * (and, for the group stage, a given matchday). Powered by the
 * `standings_filtered` SECURITY DEFINER RPC. Returns every player (0-point
 * players ranked last), like the global board, so ranks reflect phase form.
 */
export async function getStageStandings(
  stage: string,
  matchday?: number | null,
): Promise<StandingEntry[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("standings_filtered", {
    p_stage: stage,
    p_matchday: matchday ?? undefined,
  });
  if (error || !data) return [];
  return data.map(toStanding);
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
