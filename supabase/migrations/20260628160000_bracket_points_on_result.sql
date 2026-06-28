-- Crédite les points du BRACKET dès qu'un score à élimination est saisi, sans
-- dépendre du remplissage manuel des tours suivants.
--
-- Avant : recompute_bracket_points() déduisait « quelles équipes ont atteint le
-- tour X » des LIGNES de match du tour X (ref.matches.home/away_team_id), qui
-- restent NULL tant que l'admin n'a pas rempli le bracket à la main → aucun
-- point bracket n'était crédité en saisissant juste les scores. De plus le
-- trigger ne se déclenchait pas sur les résultats de 16e (r32).
--
-- Après : « équipe qualifiée pour le tour X » = VAINQUEUR réel (winner_team_id,
-- posé par admin_set_match_result, tirs au but inclus) du match du tour
-- PRÉCÉDENT terminé. Le trigger se déclenche aussi sur r32. Donc chaque score
-- saisi recalcule et crédite immédiatement les points du bracket.
-- Strictement plus robuste : quand le bracket EST rempli, le set de vainqueurs
-- du tour précédent = les équipes présentes au tour suivant (identique).

create or replace function public.recompute_bracket_points()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rules jsonb;
  v_p_r16 int; v_p_qf int; v_p_sf int; v_p_final int;
  v_p_champ int; v_p_ru int; v_p_third int;
  v_a_r16 uuid[]; v_a_qf uuid[]; v_a_sf uuid[]; v_a_final uuid[];
  v_a_champion uuid; v_a_runner_up uuid; v_a_third uuid;
  v_pred_r16 uuid[]; v_pred_qf uuid[]; v_pred_sf uuid[]; v_pred_final uuid[];
  v_pred_champ uuid; v_pred_ru uuid; v_pred_third uuid;
  v_pts int;
  rec record;
begin
  select scoring_rules into v_rules from public.app_settings where id = 1;
  v_p_r16   := coalesce((v_rules->>'bracket_r16')::int, 1);
  v_p_qf    := coalesce((v_rules->>'bracket_qf')::int, 3);
  v_p_sf    := coalesce((v_rules->>'bracket_sf')::int, 6);
  v_p_final := coalesce((v_rules->>'bracket_final')::int, 10);
  v_p_champ := coalesce((v_rules->>'bracket_champion')::int, 30);
  v_p_ru    := coalesce((v_rules->>'bracket_runner_up')::int, 20);
  v_p_third := coalesce((v_rules->>'bracket_third')::int, 15);

  -- Équipes qui ont RÉELLEMENT atteint chaque tour = vainqueurs du tour
  -- précédent (résultat saisi → winner_team_id). Indépendant du remplissage
  -- des lignes de match du tour suivant.
  --   atteint les 8es (r16) = a gagné son 16e (r32)
  --   atteint les quarts    = a gagné son 8e
  --   atteint les demies    = a gagné son quart
  --   atteint la finale     = a gagné sa demie
  select array_agg(distinct winner_team_id) into v_a_r16
    from ref.matches where stage = 'r32' and status = 'finished' and winner_team_id is not null;
  select array_agg(distinct winner_team_id) into v_a_qf
    from ref.matches where stage = 'r16' and status = 'finished' and winner_team_id is not null;
  select array_agg(distinct winner_team_id) into v_a_sf
    from ref.matches where stage = 'qf' and status = 'finished' and winner_team_id is not null;
  select array_agg(distinct winner_team_id) into v_a_final
    from ref.matches where stage = 'sf' and status = 'finished' and winner_team_id is not null;

  select winner_team_id into v_a_champion
    from ref.matches where stage = 'final' and status = 'finished'
    and winner_team_id is not null limit 1;
  select case when home_team_id = v_a_champion then away_team_id else home_team_id end
    into v_a_runner_up
    from ref.matches where stage = 'final' and status = 'finished'
    and winner_team_id is not null limit 1;
  select winner_team_id into v_a_third
    from ref.matches where stage = 'third_place' and status = 'finished'
    and winner_team_id is not null limit 1;

  for rec in
    select user_id, knockout_winners, champion_team_id
      from public.tournament_predictions
  loop
    -- Équipes que CE joueur a fait avancer vers chaque tour (= vainqueurs
    -- qu'il a désignés au tour précédent).
    select array_agg((kw.value)::uuid) into v_pred_r16
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'r32' and kw.value <> '';
    select array_agg((kw.value)::uuid) into v_pred_qf
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'r16' and kw.value <> '';
    select array_agg((kw.value)::uuid) into v_pred_sf
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'qf' and kw.value <> '';
    select array_agg((kw.value)::uuid) into v_pred_final
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'sf' and kw.value <> '';

    v_pred_champ := rec.champion_team_id;
    -- Finaliste prédit ≠ champion (l'autre vainqueur de demie).
    select (kw.value)::uuid into v_pred_ru
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'sf' and kw.value <> ''
       and (kw.value)::uuid is distinct from rec.champion_team_id
     limit 1;
    -- 3e prédit = vainqueur désigné du match pour la 3e place.
    select (kw.value)::uuid into v_pred_third
      from jsonb_each_text(rec.knockout_winners) kw
      join ref.matches m on m.match_number = kw.key::int
     where m.stage = 'third_place' and kw.value <> ''
     limit 1;

    v_pts := 0;
    v_pts := v_pts + v_p_r16 * coalesce(
      (select count(distinct x)::int from unnest(v_pred_r16) x where x = any(v_a_r16)), 0);
    v_pts := v_pts + v_p_qf * coalesce(
      (select count(distinct x)::int from unnest(v_pred_qf) x where x = any(v_a_qf)), 0);
    v_pts := v_pts + v_p_sf * coalesce(
      (select count(distinct x)::int from unnest(v_pred_sf) x where x = any(v_a_sf)), 0);
    v_pts := v_pts + v_p_final * coalesce(
      (select count(distinct x)::int from unnest(v_pred_final) x where x = any(v_a_final)), 0);
    if v_pred_champ is not null and v_pred_champ = v_a_champion then
      v_pts := v_pts + v_p_champ;
    end if;
    if v_pred_ru is not null and v_pred_ru = v_a_runner_up then
      v_pts := v_pts + v_p_ru;
    end if;
    if v_pred_third is not null and v_pred_third = v_a_third then
      v_pts := v_pts + v_p_third;
    end if;

    -- Réécrit le pari "bracket" du joueur (idempotent).
    delete from public.bets
     where user_id = rec.user_id and bet_type = 'bracket' and match_id is null;
    if v_pts > 0 then
      insert into public.bets (
        user_id, league_id, match_id, bet_type, payload, stake_cents,
        status, result, points, submitted_at
      ) values (
        rec.user_id, null, null, 'bracket',
        jsonb_build_object('kind', 'bracket_score'), 0,
        'settled', 'won', v_pts, now()
      );
    end if;
  end loop;
end;
$function$;

-- Le recalcul doit aussi se déclencher sur les résultats de 16e (r32) — c'est
-- là que se gagnent les premiers points bracket (atteindre les 8es).
drop trigger if exists recompute_bracket_on_result on ref.matches;
create trigger recompute_bracket_on_result
  after insert or update on ref.matches
  for each row
  when (new.stage = any (array['r32','r16','qf','sf','third_place','final']::match_stage[]))
  execute function trg_recompute_bracket();

-- Backfill immédiat : crédite les tours déjà joués (ex. Canada vainqueur du
-- M73) sans attendre le prochain résultat.
select public.recompute_bracket_points();
