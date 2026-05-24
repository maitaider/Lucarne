-- =============================================================================
-- Tournament-wide bracket predictions
-- =============================================================================
-- Lets every signed-in user build the WHOLE World Cup scenario before
-- kickoff: rank each group 1→4, advance teams through R32 / R16 / QF / SF /
-- 3rd-place / Final. One row per user, fully locked at
-- `app_settings.tournament_start_at - 1 hour` (the buy-in deadline rule
-- already aligned with that boundary).
--
-- Per-match picks (winner / total goals / scorers) keep working as a
-- refinement layer DURING the tournament.
-- =============================================================================

create table if not exists public.tournament_predictions (
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- Per-group rankings. JSON shape:
  --   { "A": ["<team_uuid_1st>", "<team_uuid_2nd>", "<team_uuid_3rd>", "<team_uuid_4th>"], "B": [...], ... }
  -- 12 groups (A through L). 48 team picks total.
  group_standings jsonb not null default '{}'::jsonb,

  -- Knockout pick per match. Key = ref.matches.match_number cast as text
  -- (e.g. "73" for the first R32 tie). Value = team_uuid of the predicted
  -- winner. Up to 32 picks (16 R32 + 8 R16 + 4 QF + 2 SF + 1 3rd + 1 Final).
  knockout_winners jsonb not null default '{}'::jsonb,

  -- Cached pointer to the predicted Cup winner (== knockout_winners[final.match_number]).
  -- Denormalised for fast leaderboard / community-share queries.
  champion_team_id uuid references ref.teams (id) on delete set null,

  -- Optional top-scorer pick. Resolved against ref.players.
  top_scorer_player_id uuid references ref.players (id) on delete set null,

  -- Snapshot at first lock. Null until the lock fires.
  locked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_predictions_champion
  on public.tournament_predictions (champion_team_id)
  where champion_team_id is not null;

drop trigger if exists tournament_predictions_set_updated_at
  on public.tournament_predictions;
create trigger tournament_predictions_set_updated_at
  before update on public.tournament_predictions
  for each row execute function public.set_updated_at();

alter table public.tournament_predictions enable row level security;

-- Each user reads + writes their OWN row. Admins can read all (for stats
-- + future leaderboard work).
drop policy if exists "tournament_predictions_self_read"
  on public.tournament_predictions;
create policy "tournament_predictions_self_read"
  on public.tournament_predictions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "tournament_predictions_self_write"
  on public.tournament_predictions;
create policy "tournament_predictions_self_write"
  on public.tournament_predictions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: upsert_tournament_prediction
-- ---------------------------------------------------------------------------
-- Single endpoint to save the whole bracket atomically. Refuses writes once
-- the global lock has passed (tournament_start_at - 1h, mirroring the
-- buy-in cut-off).
-- ---------------------------------------------------------------------------
create or replace function public.upsert_tournament_prediction(
  p_group_standings jsonb,
  p_knockout_winners jsonb,
  p_champion_team_id uuid,
  p_top_scorer_player_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.app_settings%rowtype;
  v_lock_at timestamptz;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;

  select * into v_settings from public.app_settings where id = 1;
  v_lock_at := coalesce(
    v_settings.buy_in_deadline,
    v_settings.tournament_start_at - interval '1 hour'
  );
  if v_lock_at is not null and now() >= v_lock_at then
    raise exception 'bracket_locked';
  end if;

  insert into public.tournament_predictions (
    user_id, group_standings, knockout_winners,
    champion_team_id, top_scorer_player_id
  )
  values (
    v_uid,
    coalesce(p_group_standings, '{}'::jsonb),
    coalesce(p_knockout_winners, '{}'::jsonb),
    p_champion_team_id,
    p_top_scorer_player_id
  )
  on conflict (user_id) do update
     set group_standings      = excluded.group_standings,
         knockout_winners     = excluded.knockout_winners,
         champion_team_id     = excluded.champion_team_id,
         top_scorer_player_id = excluded.top_scorer_player_id,
         updated_at           = now();
end;
$$;

revoke all on function public.upsert_tournament_prediction from public;
grant execute on function public.upsert_tournament_prediction to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: lock_all_tournament_predictions
-- ---------------------------------------------------------------------------
-- Called by admin / cron at T-1h to snapshot every prediction. After this,
-- the application RPC above refuses writes anyway, but this stamps the
-- lock timestamp on each row for audit + future scoring.
-- ---------------------------------------------------------------------------
create or replace function public.lock_all_tournament_predictions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_count int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    -- Allow service_role to call too (for the cron).
    if current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
       and current_setting('role', true) is distinct from 'service_role' then
      raise exception 'forbidden';
    end if;
  end if;

  update public.tournament_predictions
     set locked_at = coalesce(locked_at, now())
   where locked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.lock_all_tournament_predictions from public;
grant execute on function public.lock_all_tournament_predictions
  to authenticated, service_role;

notify pgrst, 'reload schema';
