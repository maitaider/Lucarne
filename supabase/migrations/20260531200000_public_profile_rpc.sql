-- =============================================================================
-- Phase 3 — Profils publics (/u/[username])
-- =============================================================================
-- Public player profiles, readable only by league co-members (or an admin, or
-- the player themselves). Mirrors the `league_feed` SECURITY DEFINER model:
--   * the visibility gate lives in the function and joins `league_members`
--     directly (NOT bets.league_id, which is usually null);
--   * never selects email / balance_cents / total_*_cents (privacy);
--   * the bets anti-copy rule is honoured implicitly — only SETTLED bets are
--     returned, and a settled bet's match is by definition already finished.
-- =============================================================================

-- --- Internal: resolve a username to a user_id the caller may view. ----------
-- Returns NULL when the username doesn't exist OR the caller is not a
-- co-member / admin / the player themselves. The page 404s in both cases, so a
-- non-member can never even confirm that a username exists.
-- Kept internal (revoked from the API) — only the definer RPCs below call it.
create or replace function public.resolve_viewable_profile(p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  select p.id into v_target
  from public.profiles p
  where p.username = p_username::citext and p.deleted_at is null;

  if v_target is null then
    return null;
  end if;

  if auth.uid() = v_target
     or public.is_admin()
     or exists (
       select 1
       from public.league_members me
       join public.league_members them on them.league_id = me.league_id
       where me.user_id = auth.uid() and me.status = 'active'
         and them.user_id = v_target and them.status = 'active'
     )
  then
    return v_target;
  end if;

  return null;
end;
$$;

revoke all on function public.resolve_viewable_profile(text) from public;

-- --- Public profile overview: identity + global rank + aggregate stats. ------
-- Reads the live global standings view (already aggregates every player's
-- points) filtered to the target. No email, no money columns.
create or replace function public.public_profile(p_username text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  role text,
  total_points int,
  wins int,
  losses int,
  settled_count int,
  bets_count int,
  rank int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
begin
  if v_target is null then
    return;
  end if;

  return query
  select
    s.user_id,
    s.username::text,
    s.display_name,
    s.avatar_url,
    s.role::text,
    s.total_points::int,
    s.wins::int,
    s.losses::int,
    s.settled_count::int,
    s.bets_count::int,
    s.rank::int
  from public.mv_global_standings s
  where s.user_id = v_target;
end;
$$;

revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to authenticated;

-- --- Recent SETTLED predictions for a profile. -------------------------------
-- Only settled bets => the match is finished => no pre-kickoff pick leak.
-- Team names / flags resolved here so the client needs no extra cross-schema
-- read (PostgREST can't always embed the ref.matches FK).
create or replace function public.profile_recent_bets(
  p_username text,
  p_limit int default 8
)
returns table (
  bet_id uuid,
  match_id uuid,
  kickoff_at timestamptz,
  match_status text,
  bet_type text,
  result text,
  points int,
  payload jsonb,
  home_name_fr text,
  home_name_en text,
  home_iso text,
  home_fifa text,
  home_score int,
  away_name_fr text,
  away_name_en text,
  away_iso text,
  away_fifa text,
  away_score int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
begin
  if v_target is null then
    return;
  end if;

  return query
  select
    b.id,
    b.match_id,
    m.kickoff_at,
    m.status::text,
    b.bet_type::text,
    b.result::text,
    b.points::int,
    b.payload,
    ht.name_fr, ht.name_en, ht.iso_code, ht.fifa_code, m.home_score::int,
    awt.name_fr, awt.name_en, awt.iso_code, awt.fifa_code, m.away_score::int
  from public.bets b
  left join ref.matches m on m.id = b.match_id
  left join ref.teams ht on ht.id = m.home_team_id
  left join ref.teams awt on awt.id = m.away_team_id
  where b.user_id = v_target and b.status = 'settled'
  order by coalesce(m.kickoff_at, b.submitted_at) desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.profile_recent_bets(text, int) from public;
grant execute on function public.profile_recent_bets(text, int) to authenticated;

notify pgrst, 'reload schema';
