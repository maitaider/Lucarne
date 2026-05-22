-- =============================================================================
-- Lucarne — Simple-points scoring v1
-- =============================================================================
-- Changes:
--   1. Bets become points-only: stake_cents allowed = 0, no payout in tokens.
--      The prize pool (real money) is split top-3 at tournament end.
--   2. Kickoff buffer extended from 60s → 1h (3600s).
--   3. New bet type `total_goals` (total goals in a match).
--   4. compute_bet_points rewritten:
--        match_winner → +3 pts if correct
--        total_goals  → +5 pts exact, +2 pts ±1
--        exact_score  → +5 pts (still supported)
--        anytime_scorer → +4 pts × number of correct players
--        first_scorer → +8 pts if correct
--   5. App settings scoring_rules default updated.
-- =============================================================================

-- Allow stake_cents = 0 (we keep the column for future flexibility)
alter table public.bets drop constraint if exists bets_stake_cents_check;
alter table public.bets add constraint bets_stake_cents_check
  check (stake_cents >= 0 and stake_cents <= 100000);

-- Default stake to 0 — pari gratuit en points
alter table public.bets alter column stake_cents set default 0;

-- Add total_goals to bet type enum if missing
do $$ begin
  alter type bet_type_enum add value if not exists 'total_goals';
exception when others then null; end $$;

-- Update default app_settings scoring_rules to reflect the new scheme
update public.app_settings set scoring_rules = '{
  "match_winner": 3,
  "total_goals_exact": 5,
  "total_goals_close": 2,
  "exact_score": 5,
  "anytime_scorer_each": 4,
  "first_scorer": 8
}'::jsonb where id = 1;

-- ---------------------------------------------------------------------------
-- place_bet — extend buffer to 1 hour + accept stake_cents = 0
-- ---------------------------------------------------------------------------
create or replace function public.place_bet(
  p_league_id uuid,
  p_match_id uuid,
  p_bet_type bet_type_enum,
  p_payload jsonb,
  p_stake_cents int default 0,
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match ref.matches%rowtype;
  v_id uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_stake_cents < 0 or p_stake_cents > 100000 then
    raise exception 'invalid_stake';
  end if;

  -- Idempotency
  if p_client_request_id is not null then
    select id into v_existing
      from public.bets
     where user_id = auth.uid()
       and client_request_id = p_client_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- Match validation for match-bound bets
  if p_match_id is not null then
    select * into v_match from ref.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
    -- 1 hour buffer before kickoff
    if v_match.kickoff_at - interval '1 hour' < now() then
      raise exception 'kickoff_too_close';
    end if;
  end if;

  -- League membership check (only if league_id given)
  if p_league_id is not null then
    if not public.is_league_member(p_league_id) then
      raise exception 'not_a_league_member';
    end if;
  end if;

  insert into public.bets (
    user_id, league_id, match_id, bet_type, payload, stake_cents,
    status, client_request_id, submitted_at
  )
  values (
    auth.uid(), p_league_id, p_match_id, p_bet_type, p_payload, p_stake_cents,
    'validated', p_client_request_id, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.place_bet from public;
grant execute on function public.place_bet to authenticated;

-- ---------------------------------------------------------------------------
-- compute_bet_points — points-only scoring
-- ---------------------------------------------------------------------------
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
  v_pred_home int;
  v_pred_away int;
  v_pred_total int;
  v_actual_winner text;
  v_actual_total int;
  v_diff int;
  v_pred_players jsonb;
  v_pred_player_name text;
  v_correct_count int := 0;
  v_pl jsonb;
begin
  select * into v_bet from public.bets where id = p_bet_id;
  if v_bet.id is null or v_bet.status <> 'validated' then return; end if;

  if v_bet.match_id is not null then
    select * into v_match from ref.matches where id = v_bet.match_id;
    if v_match.status <> 'finished' then return; end if;
  end if;

  select scoring_rules into v_rules from public.app_settings where id = 1;
  if v_rules is null then
    v_rules := '{
      "match_winner": 3,
      "total_goals_exact": 5,
      "total_goals_close": 2,
      "exact_score": 5,
      "anytime_scorer_each": 4,
      "first_scorer": 8
    }'::jsonb;
  end if;

  -- match_winner (1N2)
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

  -- total_goals (exact match or ±1)
  elsif v_bet.bet_type = 'total_goals' and v_match.id is not null then
    v_pred_total := (v_bet.payload->>'total')::int;
    v_actual_total := coalesce(v_match.home_score, 0) + coalesce(v_match.away_score, 0);
    v_diff := abs(v_pred_total - v_actual_total);
    if v_diff = 0 then
      v_points := coalesce((v_rules->>'total_goals_exact')::int, 5);
      v_result := 'won';
    elsif v_diff = 1 then
      v_points := coalesce((v_rules->>'total_goals_close')::int, 2);
      v_result := 'won';
    end if;

  -- exact_score (legacy support)
  elsif v_bet.bet_type = 'exact_score' and v_match.id is not null then
    v_pred_home := (v_bet.payload->>'home')::int;
    v_pred_away := (v_bet.payload->>'away')::int;
    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_points := coalesce((v_rules->>'exact_score')::int, 5);
      v_result := 'won';
    end if;

  -- anytime_scorer (predict players who scored anytime)
  elsif v_bet.bet_type = 'anytime_scorer' and v_match.id is not null then
    v_pred_players := v_bet.payload->'players';
    v_correct_count := 0;
    if v_pred_players is not null then
      for v_pl in select * from jsonb_array_elements(v_pred_players)
      loop
        v_pred_player_name := lower(trim(v_pl->>'player_name'));
        if v_pred_player_name is null or v_pred_player_name = '' then continue; end if;
        if exists (
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

  -- first_scorer
  elsif v_bet.bet_type = 'first_scorer' and v_match.id is not null then
    v_pred_player_name := lower(trim(v_bet.payload->>'player_name'));
    if exists (
      select 1 from ref.match_events me
      where me.match_id = v_match.id
        and me.event_type in ('goal', 'penalty_goal')
        and me.minute = (
          select min(minute) from ref.match_events m2
          where m2.match_id = v_match.id and m2.event_type in ('goal','penalty_goal')
        )
        and lower(trim(me.player_name)) = v_pred_player_name
    ) then
      v_points := coalesce((v_rules->>'first_scorer')::int, 8);
      v_result := 'won';
    end if;
  end if;

  -- Update bet (points only, no payout)
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
grant execute on function public.compute_bet_points to authenticated;

-- ---------------------------------------------------------------------------
-- Refresh standings materialized views so they re-aggregate by points only
-- ---------------------------------------------------------------------------
refresh materialized view public.mv_league_standings;
refresh materialized view public.mv_global_standings;

notify pgrst, 'reload schema';
