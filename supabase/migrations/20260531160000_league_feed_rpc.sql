-- =============================================================================
-- PHASE 1 — Feed de ligue vivant (O5)
-- The league activity feed filtered bets.league_id, which is almost always null
-- (picks are placed globally, not league-scoped), so the feed was always empty.
-- And the bets RLS co-member branch ALSO requires league_id is not null, so a
-- naive user_id-in-members query would still only return the caller's own bets.
--
-- Fix: a SECURITY DEFINER RPC that links members via league_members (not
-- bets.league_id) and applies the SAME kickoff-reveal rule as the RLS policy
-- server-side — so a member can't peek at others' picks before kickoff, but
-- locked/settled picks of co-members surface in the feed.
-- =============================================================================

create or replace function public.league_feed(
  p_league_id uuid,
  p_limit int default 25
)
returns table (
  id uuid,
  bet_type text,
  status text,
  result text,
  points int,
  payload jsonb,
  submitted_at timestamptz,
  user_id uuid,
  match_id uuid,
  username text,
  display_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
begin
  -- Only league members (or an admin) may read a league's feed.
  if not (v_is_admin or public.is_league_member(p_league_id)) then
    return;
  end if;

  return query
  select
    b.id,
    b.bet_type::text,
    b.status::text,
    b.result::text,
    b.points,
    b.payload,
    b.submitted_at,
    b.user_id,
    b.match_id,
    p.username,
    p.display_name
  from public.bets b
  join public.league_members lm
    on lm.user_id = b.user_id and lm.league_id = p_league_id
  join public.profiles p
    on p.id = b.user_id and p.deleted_at is null
  where b.status in ('validated', 'settled')
    and (
      b.user_id = v_caller
      or v_is_admin
      or (
        b.match_id is not null and exists (
          select 1 from ref.matches m
          where m.id = b.match_id and now() >= m.kickoff_at
        )
      )
      or (
        b.match_id is null
        and now() >= (select min(matches.kickoff_at) from ref.matches)
      )
    )
  order by b.submitted_at desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.league_feed(uuid, int) from public;
grant execute on function public.league_feed(uuid, int) to authenticated;

notify pgrst, 'reload schema';
