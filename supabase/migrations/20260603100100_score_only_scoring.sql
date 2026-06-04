-- =============================================================================
-- Pointage simplifié — basé UNIQUEMENT sur le score final
-- =============================================================================
-- Décision produit : le système de points est réduit à ce qui se déduit du
-- score d'un match. Plus de buteurs, plus de premier buteur, plus de bracket.
-- L'admin n'a qu'à saisir le score (et le statut), ce qui supprime la saisie de
-- noms — la principale source de gestion et d'erreurs.
--
-- Barème (cumulatif sur un pronostic de score, comme avant) :
--   * bon vainqueur ......... +3
--   * bon total de buts ..... +5 (exact) / +2 (à ±1)
--   * score exact ........... +5
--   → jusqu'à +13 sur un seul match.
--
-- On retire des branches `anytime_scorer` et `first_scorer` : ces paris (s'il en
-- reste) sont réglés à 0 (result 'lost'). L'UID ne les propose plus.
-- =============================================================================

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

  -- A score prediction earns the FULL breakdown, cumulatively —
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

  end if;
  -- Note: scorer bets (anytime_scorer / first_scorer) hit no branch → settle to
  -- 0 (result 'lost'). The UI no longer offers them.

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

notify pgrst, 'reload schema';
