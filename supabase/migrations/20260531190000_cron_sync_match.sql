-- =============================================================================
-- PHASE 2 — Sync cron correct (O3)
-- Two bugs made the cron a silent no-op:
--   1. it matched ref.matches on external_id (= 'fifa-wc26-NNN') against the
--      API-Football fixture id → never matched. The right key is the dedicated
--      api_football_fixture_id column (int).
--   2. it wrote ref.matches via a session-less server client (anon role), which
--      has no write access to ref.* (writes go through SECURITY DEFINER).
-- This RPC is the write path: matched on api_football_fixture_id, service_role
-- only. Finishing a match still fires settle_match_bets automatically.
--
-- NOTE: api_football_fixture_id must be populated per match for the cron to
-- match anything (mapping our 104 fixtures to API-Football ids). Until then the
-- cron reports 0 matched (loudly) instead of silently doing nothing.
-- =============================================================================

create or replace function public.cron_sync_match(
  p_fixture_id int,
  p_status text,
  p_home int default null,
  p_away int default null
)
returns boolean
language plpgsql
security definer
set search_path = public, ref
as $$
declare
  v_id uuid;
  v_home_team uuid;
  v_away_team uuid;
  v_winner uuid;
begin
  if p_status not in ('scheduled', 'live', 'finished', 'postponed', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select id, home_team_id, away_team_id
    into v_id, v_home_team, v_away_team
    from ref.matches
   where api_football_fixture_id = p_fixture_id;
  if not found then
    return false; -- this fixture isn't mapped to one of our matches
  end if;

  if p_status = 'finished' and p_home is not null and p_away is not null then
    if p_home > p_away then v_winner := v_home_team;
    elsif p_away > p_home then v_winner := v_away_team;
    else v_winner := null;
    end if;
  end if;

  update ref.matches
     set status = p_status::match_status,
         home_score = p_home,
         away_score = p_away,
         winner_team_id = case
           when p_status = 'finished' then v_winner
           else winner_team_id
         end,
         last_synced_at = now(),
         updated_at = now()
   where id = v_id;
  -- The settle_match_bets trigger fires on the transition to 'finished'.

  return true;
end;
$$;

-- System path only: no user ever calls this (the cron uses the service-role
-- client). Not granted to authenticated/anon.
revoke all on function public.cron_sync_match(int, text, int, int) from public;
grant execute on function public.cron_sync_match(int, text, int, int) to service_role;

notify pgrst, 'reload schema';
