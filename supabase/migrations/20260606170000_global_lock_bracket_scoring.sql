-- ===========================================================================
-- Verrou global + scoring de la phase finale (bracket)
-- ---------------------------------------------------------------------------
-- Décision produit (2026-06-06) :
--   1. UN SEUL verrou : tous les pronostics (scores de poule + arbre) se
--      remplissent jusqu'à 1 h avant le coup d'envoi du 1er match, puis tout
--      est gelé pour TOUT LE MONDE (avant : les payeurs éditaient à vie ;
--      `place_bet` verrouillait par match). On réutilise l'échéance qui sert
--      déjà à `upsert_tournament_prediction` (= tournament_start_at − 1h, ou
--      l'override `buy_in_deadline`).
--   2. NOUVEAU scoring de l'arbre : « plus ton arbre colle à la réalité, plus
--      tu marques », avec un gros lot pour le podium. Stocké comme UN pari par
--      joueur (`bet_type = 'bracket'`, `match_id = null`) → il entre tout seul
--      dans tous les totaux qui somment `bets.points` (classements, profil).
--      Barème configurable dans `app_settings.scoring_rules->'bracket'`.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Échéance unique + helper "pronostics verrouillés ?"
-- ---------------------------------------------------------------------------
create or replace function public.global_prediction_deadline()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select buy_in_deadline from public.app_settings where id = 1),
    (select tournament_start_at from public.app_settings where id = 1)
      - interval '1 hour'
  );
$$;

create or replace function public.predictions_locked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.global_prediction_deadline() is not null
     and now() >= public.global_prediction_deadline();
$$;

grant execute on function public.global_prediction_deadline() to authenticated, anon, service_role;
grant execute on function public.predictions_locked() to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 2) place_bet : verrou GLOBAL unique (au lieu du buffer par match)
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
  v_role app_role;
  v_id uuid;
  v_existing_active uuid;
  v_existing_idem uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_stake_cents < 0 or p_stake_cents > 100000 then
    raise exception 'invalid_stake';
  end if;

  -- Verrou unique : tout gèle 1 h avant le 1er match, pour tout le monde.
  if public.predictions_locked() then
    raise exception 'predictions_locked';
  end if;

  select role into v_role from public.profiles where id = auth.uid();

  -- Accès : les admins sont exemptés ; les autres ont besoin d'un paiement.
  if v_role not in ('admin', 'super_admin') then
    if not public.has_paid_buy_in(auth.uid()) then
      raise exception 'buy_in_required';
    end if;
  end if;

  -- Idempotence par client_request_id (rejouabilité sûre)
  if p_client_request_id is not null then
    select id into v_existing_idem
      from public.bets
     where user_id = auth.uid()
       and client_request_id = p_client_request_id;
    if v_existing_idem is not null then
      return v_existing_idem;
    end if;
  end if;

  -- Validation du match pour les paris liés à un match (le verrou global
  -- ci-dessus a déjà fermé la fenêtre — plus de buffer par match).
  if p_match_id is not null then
    select * into v_match from ref.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
  end if;

  -- Appartenance à la ligue
  if p_league_id is not null then
    if not public.is_league_member(p_league_id) then
      raise exception 'not_a_league_member';
    end if;
  end if;

  -- UPSERT : un pari actif existant pour ce match+type est mis à jour
  if p_match_id is not null then
    select id into v_existing_active
      from public.bets
     where user_id = auth.uid()
       and match_id = p_match_id
       and bet_type = p_bet_type
       and status = 'validated';

    if v_existing_active is not null then
      update public.bets
         set payload = p_payload,
             stake_cents = p_stake_cents,
             submitted_at = now(),
             client_request_id = coalesce(p_client_request_id, client_request_id),
             updated_at = now()
       where id = v_existing_active;
      return v_existing_active;
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

revoke all on function public.place_bet(uuid, uuid, bet_type_enum, jsonb, int, uuid) from public;
grant execute on function public.place_bet(uuid, uuid, bet_type_enum, jsonb, int, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Barème par défaut du bracket (configurable ensuite via l'admin économie)
-- ---------------------------------------------------------------------------
-- Clés PLATES (compatibles `Record<string, number>` côté TS + éditeur admin).
update public.app_settings
   set scoring_rules = coalesce(scoring_rules, '{}'::jsonb) || jsonb_build_object(
         'bracket_r16', 1,
         'bracket_qf', 3,
         'bracket_sf', 6,
         'bracket_final', 10,
         'bracket_champion', 30,
         'bracket_runner_up', 20,
         'bracket_third', 15
       )
 where id = 1
   and not (coalesce(scoring_rules, '{}'::jsonb) ? 'bracket_champion');

-- ---------------------------------------------------------------------------
-- 4) recompute_bracket_points : score l'arbre de chaque joueur vs la réalité
-- ---------------------------------------------------------------------------
-- Principe (robuste au chemin) : pour chaque tour, on compte combien des
-- équipes que le joueur a fait avancer ont RÉELLEMENT atteint ce tour ; gros
-- bonus si champion / finaliste / 3e exacts. Résultat écrit comme 1 pari
-- `bracket` (match_id null) → sommé partout avec les points de poule.
create or replace function public.recompute_bracket_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  -- Équipes qui ont RÉELLEMENT atteint chaque tour (présentes dans un match
  -- de ce tour, équipes résolues).
  select array_agg(distinct t) into v_a_r16 from (
    select home_team_id t from ref.matches where stage = 'r16' and home_team_id is not null
    union select away_team_id from ref.matches where stage = 'r16' and away_team_id is not null
  ) s;
  select array_agg(distinct t) into v_a_qf from (
    select home_team_id t from ref.matches where stage = 'qf' and home_team_id is not null
    union select away_team_id from ref.matches where stage = 'qf' and away_team_id is not null
  ) s;
  select array_agg(distinct t) into v_a_sf from (
    select home_team_id t from ref.matches where stage = 'sf' and home_team_id is not null
    union select away_team_id from ref.matches where stage = 'sf' and away_team_id is not null
  ) s;
  select array_agg(distinct t) into v_a_final from (
    select home_team_id t from ref.matches where stage = 'final' and home_team_id is not null
    union select away_team_id from ref.matches where stage = 'final' and away_team_id is not null
  ) s;

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
$$;

grant execute on function public.recompute_bracket_points() to service_role;

-- Recalcule l'arbre dès qu'un résultat de match à élimination change (ou que
-- ses équipes sont assignées). Idempotent.
create or replace function public.trg_recompute_bracket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_bracket_points();
  return null;
end;
$$;

drop trigger if exists recompute_bracket_on_result on ref.matches;
create trigger recompute_bracket_on_result
  after insert or update on ref.matches
  for each row
  when (new.stage in ('r16', 'qf', 'sf', 'third_place', 'final'))
  execute function public.trg_recompute_bracket();

-- ---------------------------------------------------------------------------
-- 5) profile_recent_bets : exclure le pari "bracket" (match_id null) des
--    listes de pronos récents (sinon ligne sans match). Signature inchangée.
-- ---------------------------------------------------------------------------
create or replace function public.profile_recent_bets(
  p_username text,
  p_limit int default 8
)
returns table (
  bet_id uuid,
  match_id uuid,
  kickoff_at timestamptz,
  match_status text,
  bet_type text,
  result text,
  points int,
  payload jsonb,
  home_name_fr text,
  home_name_en text,
  home_iso text,
  home_fifa text,
  home_score int,
  away_name_fr text,
  away_name_en text,
  away_iso text,
  away_fifa text,
  away_score int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
begin
  if v_target is null then
    return;
  end if;

  return query
  select
    b.id,
    b.match_id,
    m.kickoff_at,
    m.status::text,
    b.bet_type::text,
    b.result::text,
    b.points::int,
    b.payload,
    ht.name_fr, ht.name_en, ht.iso_code, ht.fifa_code, m.home_score::int,
    awt.name_fr, awt.name_en, awt.iso_code, awt.fifa_code, m.away_score::int
  from public.bets b
  left join ref.matches m on m.id = b.match_id
  left join ref.teams ht on ht.id = m.home_team_id
  left join ref.teams awt on awt.id = m.away_team_id
  where b.user_id = v_target
    and b.match_id is not null                     -- exclut le pari 'bracket'
    and b.status in ('validated', 'settled')
    and (
      auth.uid() = v_target                       -- son propre profil : tous ses pronos
      or b.status = 'settled'                      -- réglé : match terminé, rien à copier
      or (                                         -- match commencé : garde anti-copie levée
        m.id is not null
        and (now() >= m.kickoff_at or m.status in ('live', 'finished'))
      )
    )
  order by coalesce(m.kickoff_at, b.submitted_at) desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.profile_recent_bets(text, int) from public;
grant execute on function public.profile_recent_bets(text, int) to authenticated;

notify pgrst, 'reload schema';
