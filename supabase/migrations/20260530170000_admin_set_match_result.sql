-- =============================================================================
-- Admin match-result entry (Plan B for live data).
-- Lets an admin set a match's score, status and scorers. ref.* is read-only to
-- API roles, so this SECURITY DEFINER RPC is the write path. Setting status to
-- 'finished' fires the existing settle_match_bets trigger, which scores every
-- validated bet — so results flow straight to user dashboards/leaderboard.
-- =============================================================================

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

  -- Winner only meaningful on a finished, decided match (null on draw).
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
end;
$$;

revoke all on function public.admin_set_match_result(uuid, int, int, text, jsonb) from public;
grant execute on function public.admin_set_match_result(uuid, int, int, text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
