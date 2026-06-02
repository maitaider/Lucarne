-- =============================================================================
-- C-4 — Un pronostic de SCORE doit appliquer le barème COMPLET.
-- -----------------------------------------------------------------------------
-- L'écran principal /predict enregistre une grille de score en bet_type
-- 'exact_score'. Avant ce correctif, compute_bet_points ne donnait QUE +5 si le
-- score était exactement bon — donc « bon vainqueur mais mauvais score = 0 pt »,
-- et le +3 vainqueur / le total de buts n'étaient JAMAIS attribués depuis cette
-- surface. Les joueurs ne voyaient pas leurs points bouger.
--
-- Correctif : la branche 'exact_score' attribue désormais, de façon CUMULATIVE,
-- le barème complet déduit du score pronostiqué :
--   • vainqueur (1/N/2)      → +3
--   • total de buts          → +5 si exact, +2 si à ±1
--   • score exact            → +5
-- Soit jusqu'à +13 pour un pronostic « 2-1 » sur un match fini « 2-1 ».
-- (Le quick-bet de la fiche match continue de poser match_winner/total_goals
-- séparément ; il n'a pas le score exact, donc pas de bonus +5 — c'est voulu.)
--
-- Seule la branche 'exact_score' change vs la version live (qui inclut déjà le
-- garde C-5 « finished ⇒ scores requis »).
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

    -- winner (1/N/2)
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

    -- total goals (exact / ±1)
    v_pred_total := v_pred_home + v_pred_away;
    v_actual_total := coalesce(v_match.home_score, 0) + coalesce(v_match.away_score, 0);
    if v_pred_total = v_actual_total then
      v_points := v_points + coalesce((v_rules->>'total_goals_exact')::int, 5);
    elsif abs(v_pred_total - v_actual_total) = 1 then
      v_points := v_points + coalesce((v_rules->>'total_goals_close')::int, 2);
    end if;

    -- exact score
    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_points := v_points + coalesce((v_rules->>'exact_score')::int, 5);
    end if;

    if v_points > 0 then v_result := 'won'; end if;

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
$function$;
