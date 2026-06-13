-- Profile bracket summary — a player's predicted FINAL FOUR (champion + the
-- other finalist + the two semi-finalists), resolved to team names/flags.
-- Powers the new "Phase finale" section on /u/[username].
--
-- Gate: SECURITY DEFINER with the SAME membership check as profile_recent_bets
-- (resolve_viewable_profile → self / admin / co-member), PLUS an anti-copy lock:
-- a bracket is a prediction about the FUTURE, so another player's bracket is
-- only revealed once predictions are globally locked. The player (self) and an
-- admin always see it; everyone else waits for the lock.
--
-- Source: public.tournament_predictions.knockout_winners is a JSON map
--   match_number (text) → predicted winner team_id.
-- The knockout match numbers are fixed (qf 97-100, sf 101-102, final 104), read
-- from ref.matches.stage so we never hard-code them here:
--   champion       = champion_team_id  (falls back to the winner of the final)
--   finalists      = winners of the two semis (101, 102)
--   semi-finalists = winners of the four quarters (97-100)
-- Output = the distinct predicted top 4:
--   rank 1 → champion, rank 2 → the other finalist (runner-up),
--   rank 3 → the two teams eliminated in the semis.

create or replace function public.profile_bracket(p_username text)
returns table (
  rank int,
  team_id uuid,
  name_fr text,
  name_en text,
  iso text,
  fifa text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
  v_champion uuid;
  v_kw jsonb;
begin
  if v_target is null then
    return; -- not found / not a viewable co-member
  end if;

  -- Anti-copy: reveal another player's bracket only once everything is locked.
  if not (v_target = auth.uid() or public.is_admin() or public.predictions_locked()) then
    return;
  end if;

  select tp.champion_team_id, tp.knockout_winners
    into v_champion, v_kw
  from public.tournament_predictions tp
  where tp.user_id = v_target;

  -- Fall back to the explicit winner of the final if no champion column is set.
  if v_champion is null and v_kw is not null then
    select (v_kw ->> m.match_number::text)::uuid
      into v_champion
    from ref.matches m
    where m.stage = 'final'
    limit 1;
  end if;

  if v_kw is null and v_champion is null then
    return; -- no bracket filled
  end if;

  return query
  with picks as (
    select m.stage::text as stage,
           (v_kw ->> m.match_number::text)::uuid as tid
    from ref.matches m
    where m.stage in ('qf', 'sf')
  ),
  finalists as (
    select tid from picks where stage = 'sf' and tid is not null
  ),
  final_four as (
    -- distinct predicted top-4 teams: champion + finalists + quarter winners
    select v_champion as tid where v_champion is not null
    union
    select tid from finalists
    union
    select tid from picks where stage = 'qf' and tid is not null
  )
  select
    (case
       when t.id = v_champion then 1
       when t.id in (select tid from finalists) then 2
       else 3
     end)::int as rank,
    t.id,
    t.name_fr,
    t.name_en,
    t.iso_code,
    t.fifa_code
  from final_four f
  join ref.teams t on t.id = f.tid
  order by rank, t.name_fr;
end;
$$;

revoke all on function public.profile_bracket(text) from anon, public;
grant execute on function public.profile_bracket(text) to authenticated, service_role;

comment on function public.profile_bracket(text) is
  'Predicted final four (champion / runner-up / semi-finalists, resolved to teams) for /u/[username]. Membership-gated via resolve_viewable_profile + anti-copy lock (predictions_locked).';
