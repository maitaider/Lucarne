-- =============================================================================
-- PHASE 2 — Recompute d'un match déjà réglé (O1)
-- Le trigger settle_match_bets ne se déclenche QUE sur la transition vers
-- 'finished', et compute_bet_points ignore les bets déjà 'settled'. Donc
-- corriger un score après coup ne re-scorait personne. On ajoute un RPC de
-- recompute (reset settled → validated, puis rejoue le scoring), et on
-- l'appelle depuis admin_set_match_result quand le statut final est 'finished'
-- (les payouts sont toujours 0, les classements sont des vues live → rien à
-- défaire côté argent/cache).
-- =============================================================================

create or replace function public.admin_recompute_match(p_match_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet_id uuid;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  -- Reset already-settled bets for this match to their pre-settle state.
  update public.bets
     set status = 'validated', result = null, points = 0, payout_cents = 0
   where match_id = p_match_id and status = 'settled';

  -- Replay scoring for every (now) validated bet of this match.
  -- compute_bet_points no-ops unless the match is finished, so this is safe
  -- to call on a non-finished match too (bets just stay validated/0).
  for v_bet_id in
    select id from public.bets
     where match_id = p_match_id and status = 'validated'
  loop
    perform public.compute_bet_points(v_bet_id);
    v_count := v_count + 1;
  end loop;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'admin_recompute_match', 'matches', p_match_id,
    jsonb_build_object('recomputed_bets', v_count)
  );

  return v_count;
end;
$$;

revoke all on function public.admin_recompute_match(uuid) from public;
grant execute on function public.admin_recompute_match(uuid) to authenticated;

-- Recreate admin_set_match_result so that (re)finishing a match always re-scores
-- — fixing the "correction does nothing" bug for an already-finished match.
create or replace function public.admin_set_match_result(
  p_match_id uuid,
  p_home_score int default null,
  p_away_score int default null,
  p_status text default 'finished',
  p_scorers jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, ref
as $$
declare
  v_home uuid;
  v_away uuid;
  v_winner uuid;
  s jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('scheduled', 'live', 'finished', 'postponed', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  select home_team_id, away_team_id into v_home, v_away
    from ref.matches where id = p_match_id;
  if not found then raise exception 'match_not_found'; end if;

  if p_status = 'finished' and p_home_score is not null and p_away_score is not null then
    if p_home_score > p_away_score then v_winner := v_home;
    elsif p_away_score > p_home_score then v_winner := v_away;
    else v_winner := null;
    end if;
  else
    v_winner := null;
  end if;

  -- Replace the goal events for this match with the provided scorers.
  delete from ref.match_events
   where match_id = p_match_id
     and event_type in ('goal', 'own_goal', 'penalty_goal');

  if jsonb_typeof(coalesce(p_scorers, '[]'::jsonb)) = 'array' then
    for s in select * from jsonb_array_elements(p_scorers)
    loop
      if coalesce(s->>'player_name', '') <> '' then
        insert into ref.match_events (match_id, minute, event_type, player_name, team_id)
        values (
          p_match_id,
          least(greatest(coalesce((s->>'minute')::int, 0), 0), 130),
          coalesce(nullif(s->>'event_type', ''), 'goal'),
          s->>'player_name',
          nullif(s->>'team_id', '')::uuid
        );
      end if;
    end loop;
  end if;

  update ref.matches
     set home_score = p_home_score,
         away_score = p_away_score,
         winner_team_id = v_winner,
         status = p_status::match_status,
         last_synced_at = now(),
         updated_at = now()
   where id = p_match_id;

  -- (Re)score whenever the match is finished. On the first transition to
  -- 'finished' the settle trigger already ran; recompute is idempotent and also
  -- catches CORRECTIONS to an already-finished match (trigger won't re-fire).
  if p_status = 'finished' then
    perform public.admin_recompute_match(p_match_id);
  end if;
end;
$$;

revoke all on function public.admin_set_match_result(uuid, int, int, text, jsonb) from public;
grant execute on function public.admin_set_match_result(uuid, int, int, text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
