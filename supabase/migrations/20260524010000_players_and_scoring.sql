-- =============================================================================
-- Player database + player_id-based scoring
-- =============================================================================
-- Goals:
--   1. Persist each team's roster so users SELECT players from a typeahead
--      instead of typing names (no more "Mbappé" vs "M'Bappe" vs "Mbappe").
--   2. Carry player_id through to match_events so compute_bet_points can
--      auto-validate anytime_scorer / first_scorer bets via FK equality
--      instead of fuzzy text match.
--   3. Add API-Football mapping columns so an external sync job (Phase 2)
--      can hydrate goals automatically without us re-keying.
-- =============================================================================

-- 1. ref.players ─────────────────────────────────────────────────────────────
-- Table exists in the initial schema with `name`. We add the extra columns
-- needed by the picker (display_name, club, active, api_football_player_id,
-- updated_at) and a couple of indexes.

alter table ref.players
  add column if not exists display_name text,
  add column if not exists club text,
  add column if not exists active boolean not null default true,
  add column if not exists api_football_player_id int,
  add column if not exists updated_at timestamptz not null default now();

-- Make team_id required for new rows. We expect a team for every roster
-- entry going forward.
alter table ref.players alter column team_id set not null;

-- Backfill display_name from name where missing (last word of the full name
-- is a reasonable shorthand). Once seeded properly we'll set it explicitly.
update ref.players
   set display_name = coalesce(
     display_name,
     trim(regexp_replace(name, '^.* ', ''))
   )
 where display_name is null or display_name = '';

alter table ref.players alter column display_name set not null;

create unique index if not exists players_team_name
  on ref.players (team_id, lower(name));
create index if not exists players_team_active
  on ref.players (team_id) where active;
create index if not exists players_active_search
  on ref.players (lower(display_name)) where active;
create index if not exists players_api_football
  on ref.players (api_football_player_id) where api_football_player_id is not null;

drop trigger if exists players_set_updated_at on ref.players;
create trigger players_set_updated_at
  before update on ref.players
  for each row execute function public.set_updated_at();

alter table ref.players enable row level security;

drop policy if exists "players_read_authenticated" on ref.players;
create policy "players_read_authenticated"
  on ref.players for select
  to authenticated, anon
  using (true);

drop policy if exists "players_admin_write" on ref.players;
create policy "players_admin_write"
  on ref.players for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on ref.players to authenticated, anon;

-- 2. ref.match_events → add player_id ────────────────────────────────────────
alter table ref.match_events
  add column if not exists player_id uuid references ref.players (id) on delete set null;

create index if not exists match_events_player_id
  on ref.match_events (player_id) where player_id is not null;

-- 3. ref.teams → API-Football mapping ───────────────────────────────────────
alter table ref.teams
  add column if not exists api_football_team_id int;
create index if not exists teams_api_football
  on ref.teams (api_football_team_id) where api_football_team_id is not null;

-- 4. ref.matches → API-Football mapping ─────────────────────────────────────
alter table ref.matches
  add column if not exists api_football_fixture_id int;
create index if not exists matches_api_football
  on ref.matches (api_football_fixture_id) where api_football_fixture_id is not null;

-- 5. RPCs: admin upsert / delete player ──────────────────────────────────────
create or replace function public.admin_upsert_player(
  p_id uuid,
  p_team_id uuid,
  p_full_name text,
  p_display_name text,
  p_shirt_number smallint default null,
  p_position text default null,
  p_club text default null,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  if length(trim(p_full_name)) < 2 then
    raise exception 'name_too_short';
  end if;

  if p_id is not null then
    update ref.players
       set team_id      = p_team_id,
           name         = trim(p_full_name),
           display_name = trim(p_display_name),
           shirt_number = p_shirt_number,
           position     = p_position,
           club         = nullif(trim(coalesce(p_club, '')), ''),
           active       = coalesce(p_active, true),
           updated_at   = now()
     where id = p_id
     returning id into v_id;
    if v_id is null then raise exception 'player_not_found'; end if;
  else
    insert into ref.players (
      team_id, name, display_name, shirt_number, position, club, active
    )
    values (
      p_team_id,
      trim(p_full_name),
      trim(p_display_name),
      p_shirt_number,
      p_position,
      nullif(trim(coalesce(p_club, '')), ''),
      coalesce(p_active, true)
    )
    on conflict (team_id, lower(name)) do update
       set display_name = excluded.display_name,
           shirt_number = excluded.shirt_number,
           position     = excluded.position,
           club         = excluded.club,
           active       = excluded.active,
           updated_at   = now()
    returning id into v_id;
  end if;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(),
    case when p_id is null then 'create_player' else 'update_player' end,
    'players',
    v_id,
    jsonb_build_object(
      'team_id', p_team_id,
      'full_name', p_full_name,
      'shirt_number', p_shirt_number
    )
  );

  return v_id;
end;
$$;

revoke all on function public.admin_upsert_player from public;
grant execute on function public.admin_upsert_player to authenticated;

create or replace function public.admin_delete_player(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;
  delete from ref.players where id = p_id;
  insert into private.audit_log (actor_id, action, target_table, target_id)
  values (auth.uid(), 'delete_player', 'players', p_id);
end;
$$;

revoke all on function public.admin_delete_player from public;
grant execute on function public.admin_delete_player to authenticated;

-- 6. compute_bet_points → match scorers by player_id first ──────────────────
create or replace function public.compute_bet_points(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet public.bets%rowtype;
  v_match ref.matches%rowtype;
  v_rules jsonb;
  v_points int := 0;
  v_result bet_result := 'lost';
  v_pred_winner text;
  v_pred_total int;
  v_actual_total int;
  v_actual_winner text;
  v_pred_home int;
  v_pred_away int;
  v_pred_players jsonb;
  v_pl jsonb;
  v_pred_player_name text;
  v_pred_player_id uuid;
  v_correct_count int;
begin
  select * into v_bet from public.bets where id = p_bet_id;
  if v_bet.id is null or v_bet.status <> 'validated' then return; end if;

  if v_bet.match_id is not null then
    select * into v_match from ref.matches where id = v_bet.match_id;
    if v_match.status <> 'finished' then return; end if;
  end if;

  select scoring_rules into v_rules from public.app_settings where id = 1;

  if v_bet.bet_type = 'match_winner' and v_match.id is not null then
    v_pred_winner := v_bet.payload->>'winner';
    if v_match.home_score > v_match.away_score then v_actual_winner := 'home';
    elsif v_match.home_score < v_match.away_score then v_actual_winner := 'away';
    else v_actual_winner := 'draw';
    end if;
    if v_pred_winner = v_actual_winner then
      v_points := coalesce((v_rules->>'match_winner')::int, 3);
      v_result := 'won';
    end if;

  elsif v_bet.bet_type = 'total_goals' and v_match.id is not null then
    v_pred_total := (v_bet.payload->>'total')::int;
    v_actual_total := coalesce(v_match.home_score, 0) + coalesce(v_match.away_score, 0);
    if v_pred_total = v_actual_total then
      v_points := coalesce((v_rules->>'total_goals_exact')::int, 5);
      v_result := 'won';
    elsif abs(v_pred_total - v_actual_total) = 1 then
      v_points := coalesce((v_rules->>'total_goals_close')::int, 2);
      v_result := 'won';
    end if;

  elsif v_bet.bet_type = 'exact_score' and v_match.id is not null then
    v_pred_home := (v_bet.payload->>'home')::int;
    v_pred_away := (v_bet.payload->>'away')::int;
    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_points := coalesce((v_rules->>'exact_score')::int, 5);
      v_result := 'won';
    end if;

  -- anytime_scorer: prefer player_id match (new picker), fall back to name
  -- so legacy text-based bets still settle correctly.
  elsif v_bet.bet_type = 'anytime_scorer' and v_match.id is not null then
    v_pred_players := v_bet.payload->'players';
    v_correct_count := 0;
    if v_pred_players is not null then
      for v_pl in select * from jsonb_array_elements(v_pred_players)
      loop
        v_pred_player_id := nullif(v_pl->>'player_id', '')::uuid;
        v_pred_player_name := lower(trim(v_pl->>'player_name'));

        if v_pred_player_id is not null and exists (
          select 1 from ref.match_events me
          where me.match_id = v_match.id
            and me.event_type in ('goal', 'penalty_goal')
            and me.player_id = v_pred_player_id
        ) then
          v_correct_count := v_correct_count + 1;
        elsif v_pred_player_name is not null and v_pred_player_name <> '' and exists (
          select 1 from ref.match_events me
          where me.match_id = v_match.id
            and me.event_type in ('goal', 'penalty_goal')
            and lower(trim(me.player_name)) = v_pred_player_name
        ) then
          v_correct_count := v_correct_count + 1;
        end if;
      end loop;
      if v_correct_count > 0 then
        v_points := v_correct_count * coalesce((v_rules->>'anytime_scorer_each')::int, 4);
        v_result := 'won';
      end if;
    end if;

  elsif v_bet.bet_type = 'first_scorer' and v_match.id is not null then
    v_pred_player_id := nullif(v_bet.payload->>'player_id', '')::uuid;
    v_pred_player_name := lower(trim(v_bet.payload->>'player_name'));
    if (v_pred_player_id is not null and exists (
      select 1 from ref.match_events me
      where me.match_id = v_match.id
        and me.event_type in ('goal', 'penalty_goal')
        and me.player_id = v_pred_player_id
        and me.minute = (
          select min(minute) from ref.match_events m2
          where m2.match_id = v_match.id and m2.event_type in ('goal','penalty_goal')
        )
    )) or (v_pred_player_name is not null and v_pred_player_name <> '' and exists (
      select 1 from ref.match_events me
      where me.match_id = v_match.id
        and me.event_type in ('goal', 'penalty_goal')
        and lower(trim(me.player_name)) = v_pred_player_name
        and me.minute = (
          select min(minute) from ref.match_events m2
          where m2.match_id = v_match.id and m2.event_type in ('goal','penalty_goal')
        )
    )) then
      v_points := coalesce((v_rules->>'first_scorer')::int, 8);
      v_result := 'won';
    end if;
  end if;

  update public.bets
     set status = 'settled', result = v_result, points = v_points, payout_cents = 0
   where id = p_bet_id;

  insert into public.notifications (user_id, type, payload)
  values (
    v_bet.user_id, 'bet_settled',
    jsonb_build_object('bet_id', v_bet.id, 'result', v_result, 'points', v_points)
  );
end;
$$;

revoke all on function public.compute_bet_points from public;
grant execute on function public.compute_bet_points to authenticated, service_role;

notify pgrst, 'reload schema';
