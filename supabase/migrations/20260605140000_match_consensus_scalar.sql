-- match_consensus: switch from an array parameter to a scalar uuid.
--
-- The original uuid[] version (migration 20260605100000) worked in SQL but was
-- silently dropped from PostgREST's REST schema cache on this project (404
-- PGRST202), while scalar-parameter siblings — match_predictions(uuid),
-- cron_send_kickoff_reminders(int) — are exposed fine. A text[] variant had the
-- same problem, so the parameter is now a single uuid; getCommunityOdds loops
-- one call per match.
--
-- Idempotent: drops any array variant, (re)creates the scalar one. Prod already
-- carries this shape (applied out-of-band); this migration aligns the history.
drop function if exists public.match_consensus(uuid[]);
drop function if exists public.match_consensus(text[]);

create or replace function public.match_consensus(p_match_id uuid)
returns table(home int, draw int, away int, total int)
language sql
stable
security definer
set search_path to 'public'
as $func$
  select
    count(*) filter (where w.pick = 'home')::int,
    count(*) filter (where w.pick = 'draw')::int,
    count(*) filter (where w.pick = 'away')::int,
    count(*)::int
  from (
    select
      case
        when b.bet_type = 'match_winner' then b.payload->>'winner'
        when (b.payload->>'home') is null or (b.payload->>'away') is null then null
        when (b.payload->>'home')::int > (b.payload->>'away')::int then 'home'
        when (b.payload->>'home')::int < (b.payload->>'away')::int then 'away'
        else 'draw'
      end as pick
    from public.bets b
    where b.match_id = p_match_id
      and b.bet_type in ('match_winner', 'exact_score')
      and b.status in ('validated', 'settled')
  ) w
  where auth.uid() is not null
    and w.pick in ('home', 'draw', 'away');
$func$;

revoke all on function public.match_consensus(uuid) from anon, public;
grant execute on function public.match_consensus(uuid) to authenticated;

notify pgrst, 'reload schema';
