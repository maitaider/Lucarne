-- =============================================================================
-- I-3 — Knockout winner resolution via penalty shootout
-- =============================================================================
-- A knockout tie that stays level is decided by penalties and MUST have a
-- winner. `admin_set_match_result` previously forced `winner_team_id := null`
-- on any level score (correct for the group stage, wrong for the knockouts) and
-- never accepted a shootout. We add `p_home_pen` / `p_away_pen` and resolve the
-- winner from the shootout when regulation/extra-time is level. A level group
-- match (no shootout) stays a genuine draw → null winner.
--
-- Adding parameters changes the signature → drop the old one first so we replace
-- it instead of creating an overload (PostgREST would then 300).
-- =============================================================================

drop function if exists public.admin_set_match_result(uuid, integer, integer, text, jsonb);

create or replace function public.admin_set_match_result(
  p_match_id uuid,
  p_home_score integer default null,
  p_away_score integer default null,
  p_status text default 'finished',
  p_scorers jsonb default '[]'::jsonb,
  p_home_pen integer default null,
  p_away_pen integer default null
)
returns void
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

  -- Regulation/extra-time score decides; a level score that carries a penalty
  -- shootout (knockout ties) is decided by the shootout; a level score with no
  -- shootout stays a genuine draw (group stage) → null.
  if p_status = 'finished' and p_home_score is not null and p_away_score is not null then
    if p_home_score > p_away_score then
      v_winner := v_home;
    elsif p_away_score > p_home_score then
      v_winner := v_away;
    elsif p_home_pen is not null and p_away_pen is not null and p_home_pen <> p_away_pen then
      v_winner := case when p_home_pen > p_away_pen then v_home else v_away end;
    else
      v_winner := null;
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
         home_pen = case when p_status = 'finished' then p_home_pen else null end,
         away_pen = case when p_status = 'finished' then p_away_pen else null end,
         winner_team_id = v_winner,
         status = p_status::match_status,
         last_synced_at = now(),
         updated_at = now()
   where id = p_match_id;

  -- (Re)score on EVERY result change — including reverting away from 'finished'.
  perform public.admin_recompute_match(p_match_id);
end;
$$;

revoke all on function public.admin_set_match_result(uuid, integer, integer, text, jsonb, integer, integer) from public;
grant execute on function public.admin_set_match_result(uuid, integer, integer, text, jsonb, integer, integer)
  to authenticated, service_role;

notify pgrst, 'reload schema';
