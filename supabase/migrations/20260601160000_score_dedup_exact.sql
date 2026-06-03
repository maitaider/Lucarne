-- =============================================================================
-- FIX — double-comptage entre les 2 surfaces de prono (incohérence C-4 résiduelle).
-- -----------------------------------------------------------------------------
-- /predict enregistre un `exact_score` (qui, depuis C-4, attribue déjà vainqueur
-- + total + score exact). Le quick-bet de la fiche match enregistre des paris
-- SÉPARÉS `match_winner` et `total_goals`. Un joueur qui utilise les deux pour le
-- MÊME match cumule : +13 (exact_score) + 5 (total_goals) + 3/0 (match_winner)
-- → le vainqueur et le total sont comptés DEUX fois (ex. observé : 18 au lieu de 13).
--
-- Fix : l'`exact_score` est AUTORITAIRE. Si un joueur a un `exact_score` pour un
-- match, ses paris `match_winner`/`total_goals` du même match ne re-comptent plus
-- (0 point, result NULL → pas de victoire/défaite, pas de notif). compute_bet_points
-- est idempotent → un recompute du match nettoie les anciens doublons.
-- Seul ajout vs la version C-4 : le bloc « dedup » avant les branches de scoring.
-- =============================================================================

create or replace function public.compute_bet_points(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    -- C-5: a finished match with missing score(s) must not settle bets.
    if v_match.home_score is null or v_match.away_score is null then return; end if;
  end if;

  -- C-4 dedup: an exact_score bet already awards winner + total + exact. A
  -- standalone match_winner/total_goals bet on the SAME match must not
  -- double-count → settle it to 0 with no win/loss (no notif).
  if v_bet.bet_type in ('match_winner', 'total_goals')
     and v_bet.match_id is not null
     and exists (
       select 1 from public.bets b2
       where b2.user_id = v_bet.user_id
         and b2.match_id = v_bet.match_id
         and b2.bet_type = 'exact_score'
     ) then
    update public.bets
       set status = 'settled', result = null, points = 0, payout_cents = 0
     where id = p_bet_id;
    return;
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

  -- C-4: a score prediction earns the FULL breakdown, cumulatively —
  -- winner (+3) + total goals (+5/+2) + exact score (+5).
  elsif v_bet.bet_type = 'exact_score' and v_match.id is not null then
    v_pred_home := (v_bet.payload->>'home')::int;
    v_pred_away := (v_bet.payload->>'away')::int;

    if v_match.home_score > v_match.away_score then v_actual_winner := 'home';
    elsif v_match.home_score < v_match.away_score then v_actual_winner := 'away';
    else v_actual_winner := 'draw';
    end if;
    v_pred_winner := case
      when v_pred_home > v_pred_away then 'home'
      when v_pred_home < v_pred_away then 'away'
      else 'draw' end;
    if v_pred_winner = v_actual_winner then
      v_points := v_points + coalesce((v_rules->>'match_winner')::int, 3);
    end if;

    v_pred_total := v_pred_home + v_pred_away;
    v_actual_total := coalesce(v_match.home_score, 0) + coalesce(v_match.away_score, 0);
    if v_pred_total = v_actual_total then
      v_points := v_points + coalesce((v_rules->>'total_goals_exact')::int, 5);
    elsif abs(v_pred_total - v_actual_total) = 1 then
      v_points := v_points + coalesce((v_rules->>'total_goals_close')::int, 2);
    end if;

    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_points := v_points + coalesce((v_rules->>'exact_score')::int, 5);
    end if;

    if v_points > 0 then v_result := 'won'; end if;

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
$function$;
