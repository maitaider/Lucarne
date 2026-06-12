-- Entrée tardive : un joueur qui paie APRÈS le verrou global obtient une
-- fenêtre personnelle de 1 h (à partir de son paiement) pour pronostiquer les
-- matchs PAS ENCORE commencés. Les payeurs « normaux » (avant le verrou)
-- gardent le verrou global → restent gelés. L'admin ouvre/ferme l'accès
-- tardif via app_settings.late_entry_open (ne gère que l'affichage du bouton
-- « Acheter ma place » ; la fenêtre de grâce est accordée par le paiement).

alter table public.app_settings
  add column if not exists late_entry_open boolean not null default false;

-- Échéance de pronostic EFFECTIVE pour le joueur courant.
--   • payeur tardif (received_at >= verrou global) → received_at + 1 h
--   • sinon → verrou global (inchangé)
create or replace function public.my_prediction_deadline()
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_global timestamptz := public.global_prediction_deadline();
  v_paid_at timestamptz;
begin
  select received_at into v_paid_at
  from public.real_payments
  where user_id = auth.uid() and status = 'confirmed'
  order by received_at desc
  limit 1;

  if v_paid_at is not null and v_global is not null and v_paid_at >= v_global then
    return v_paid_at + interval '1 hour';
  end if;
  return v_global;
end;
$$;

grant execute on function public.my_prediction_deadline() to authenticated, anon, service_role;

-- place_bet : échéance par joueur + contrôle par-match (impossible de
-- pronostiquer un match déjà commencé — le payeur tardif récolte donc 0 pt
-- sur les matchs passés). Le reste est identique.
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

  -- Échéance personnelle : verrou global, ou fenêtre de grâce pour payeur tardif.
  if now() >= public.my_prediction_deadline() then
    raise exception 'predictions_locked';
  end if;

  select role into v_role from public.profiles where id = auth.uid();

  if v_role not in ('admin', 'super_admin') then
    if not public.has_paid_buy_in(auth.uid()) then
      raise exception 'buy_in_required';
    end if;
  end if;

  if p_client_request_id is not null then
    select id into v_existing_idem
      from public.bets
     where user_id = auth.uid()
       and client_request_id = p_client_request_id;
    if v_existing_idem is not null then
      return v_existing_idem;
    end if;
  end if;

  -- Match : existence + pas déjà commencé (contrôle par-match réintroduit pour
  -- les entrées tardives ; sans effet sur les payeurs normaux, déjà gelés par
  -- le verrou global avant tout coup d'envoi).
  if p_match_id is not null then
    select * into v_match from ref.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
    if now() >= v_match.kickoff_at then
      raise exception 'match_started';
    end if;
  end if;

  if p_league_id is not null then
    if not public.is_league_member(p_league_id) then
      raise exception 'not_a_league_member';
    end if;
  end if;

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

-- upsert_tournament_prediction : même échéance par joueur (le payeur tardif
-- peut bâtir son arbre dans sa fenêtre de 1 h). Conserve le 5e paramètre
-- third_place_assignments (PR #109).
create or replace function public.upsert_tournament_prediction(
  p_group_standings jsonb,
  p_knockout_winners jsonb,
  p_champion_team_id uuid,
  p_top_scorer_player_id uuid default null,
  p_third_place_assignments jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;

  if now() >= public.my_prediction_deadline() then
    raise exception 'bracket_locked';
  end if;

  insert into public.tournament_predictions (
    user_id, group_standings, knockout_winners,
    champion_team_id, top_scorer_player_id, third_place_assignments
  )
  values (
    v_uid,
    coalesce(p_group_standings, '{}'::jsonb),
    coalesce(p_knockout_winners, '{}'::jsonb),
    p_champion_team_id,
    p_top_scorer_player_id,
    coalesce(p_third_place_assignments, '{}'::jsonb)
  )
  on conflict (user_id) do update
     set group_standings         = excluded.group_standings,
         knockout_winners        = excluded.knockout_winners,
         champion_team_id        = excluded.champion_team_id,
         top_scorer_player_id    = excluded.top_scorer_player_id,
         third_place_assignments = excluded.third_place_assignments,
         updated_at              = now();
end;
$$;

notify pgrst, 'reload schema';
