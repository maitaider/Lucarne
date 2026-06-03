-- =============================================================================
-- FIX — les points ne reviennent pas à 0 quand on sort un match de « Terminé ».
-- -----------------------------------------------------------------------------
-- admin_set_match_result ne rappelait admin_recompute_match QUE si
-- `p_status = 'finished'`. Donc repasser un match fini en « À venir »/« Live »
-- (ou corriger autrement) laissait les paris `settled` avec leurs points figés —
-- ils ne revenaient jamais à 0. Le scoring n'était « dynamique » que dans le
-- sens → finished, jamais en sens inverse.
--
-- Fix : recompute à CHAQUE changement de résultat, quel que soit le statut.
-- admin_recompute_match remet les paris settled → validated puis rejoue
-- compute_bet_points, qui n'attribue des points que pour un match `finished` :
-- donc un statut non-finished remet correctement les points à 0.
-- Seule ligne changée vs la def live : le `if p_status='finished'` devient un
-- appel inconditionnel.
-- =============================================================================

create or replace function public.admin_set_match_result(
  p_match_id uuid,
  p_home_score integer default null::integer,
  p_away_score integer default null::integer,
  p_status text default 'finished'::text,
  p_scorers jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'ref'
as $function$
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

  -- (Re)score on EVERY result change — including reverting away from 'finished'.
  -- admin_recompute_match resets settled bets to validated then re-runs
  -- compute_bet_points (which only awards points for a finished match), so a
  -- non-finished status correctly brings points back to 0.
  perform public.admin_recompute_match(p_match_id);
end;
$function$;
