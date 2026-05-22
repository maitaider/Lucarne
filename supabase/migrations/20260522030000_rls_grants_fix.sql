-- =============================================================================
-- Fixes:
--   1. Missing GRANTs on ref.* tables — RLS policies don't help if the
--      base privilege isn't there. Authenticated/anon get SELECT on
--      reference data (teams, matches, venues, players, match_events).
--   2. Recursive RLS on league_members → 42P17. Replaced with a
--      SECURITY DEFINER helper that bypasses RLS for the membership
--      check.
--   3. PostgREST schema reload notification to refresh cross-schema FK
--      cache (bets.match_id → ref.matches).
-- =============================================================================

-- 1. Reference data grants — match the policies that say "true" on these
grant usage on schema ref to authenticated, anon;

grant select on ref.teams to authenticated, anon;
grant select on ref.matches to authenticated, anon;
grant select on ref.venues to authenticated, anon;
grant select on ref.match_events to authenticated, anon;
grant select on ref.players to authenticated, anon;

-- Future ref tables also accessible
alter default privileges in schema ref grant select on tables to authenticated, anon;

-- Make sure the RLS policies allow anon access where we want public reads
drop policy if exists "ref_matches_read" on ref.matches;
create policy "ref_matches_read"
  on ref.matches for select
  to authenticated, anon
  using (true);

drop policy if exists "ref_teams_read" on ref.teams;
create policy "ref_teams_read"
  on ref.teams for select
  to authenticated, anon
  using (true);

drop policy if exists "ref_venues_read" on ref.venues;
create policy "ref_venues_read"
  on ref.venues for select
  to authenticated, anon
  using (true);

drop policy if exists "ref_match_events_read" on ref.match_events;
create policy "ref_match_events_read"
  on ref.match_events for select
  to authenticated, anon
  using (true);

drop policy if exists "ref_players_read" on ref.players;
create policy "ref_players_read"
  on ref.players for select
  to authenticated, anon
  using (true);

-- -----------------------------------------------------------------------------
-- 2. Recursive league_members policy fix
-- -----------------------------------------------------------------------------

-- Helper: bypasses RLS to check membership. SECURITY DEFINER + STABLE.
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members lm
    where lm.league_id = p_league_id
      and lm.user_id = auth.uid()
      and lm.status = 'active'
  );
$$;

revoke all on function public.is_league_member from public;
grant execute on function public.is_league_member to authenticated, anon;

-- Rewrite league_members_select to use the helper (no recursion)
drop policy if exists "league_members_select" on public.league_members;
create policy "league_members_select"
  on public.league_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_league_member(league_id)
    or public.is_admin()
  );

-- Rewrite leagues_select_visible to use the helper too (was OK but
-- inconsistent — same helper everywhere is safer)
drop policy if exists "leagues_select_visible" on public.leagues;
create policy "leagues_select_visible"
  on public.leagues for select
  to authenticated
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or public.is_league_member(id)
    or public.is_admin()
  );

-- bets_select_visible also referenced league_members in a subquery —
-- replace with helper. (Keep the kickoff-revealed logic.)
drop policy if exists "bets_select_visible" on public.bets;
create policy "bets_select_visible"
  on public.bets for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      league_id is not null
      and public.is_league_member(league_id)
      and (
        (match_id is not null and exists (
          select 1 from ref.matches m
          where m.id = bets.match_id and now() >= m.kickoff_at
        ))
        or (match_id is null and now() >= (
          select min(matches.kickoff_at) from ref.matches
        ))
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Force PostgREST schema reload
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';
