-- =============================================================================
-- Show EVERY participant in the standings (admin + all players), with 0 pts
-- before any result — not only those who have placed a bet.
--
-- Root cause: mv_global_standings / mv_league_standings were MATERIALIZED views
-- built FROM public.bets (so only bet-havers appeared, and stale until a
-- refresh). Rebuild them as REGULAR views starting FROM profiles / league
-- members, LEFT JOINing bet stats. Regular views are always live (no refresh
-- trigger needed) and a small private pool makes the cost negligible. Bets are
-- not league-scoped in the current model, so league points = global points.
-- =============================================================================

-- The bet-update trigger refreshed the matviews; regular views are always
-- current, so drop it and neutralize the function (defensive).
drop trigger if exists bets_refresh_standings on public.bets;

create or replace function public.refresh_standings()
returns trigger
language plpgsql
as $$
begin
  return null; -- no-op: standings are now live regular views
end;
$$;

drop materialized view if exists public.mv_global_standings;
drop materialized view if exists public.mv_league_standings;

create view public.mv_global_standings as
with bet_stats as (
  select
    b.user_id,
    coalesce(sum(b.points), 0) as total_points,
    count(*) filter (where b.result = 'won') as wins,
    count(*) filter (where b.result = 'lost') as losses,
    count(*) filter (where b.status = 'settled') as settled_count,
    count(*) as bets_count
  from public.bets b
  group by b.user_id
)
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  coalesce(bs.total_points, 0) as total_points,
  coalesce(bs.wins, 0) as wins,
  coalesce(bs.losses, 0) as losses,
  coalesce(bs.settled_count, 0) as settled_count,
  coalesce(bs.bets_count, 0) as bets_count,
  rank() over (
    order by coalesce(bs.total_points, 0) desc, coalesce(bs.wins, 0) desc, p.created_at asc
  ) as rank
from public.profiles p
left join bet_stats bs on bs.user_id = p.id
where p.deleted_at is null;

create view public.mv_league_standings as
with bet_stats as (
  select
    b.user_id,
    coalesce(sum(b.points), 0) as total_points,
    count(*) filter (where b.result = 'won') as wins,
    count(*) filter (where b.result = 'lost') as losses,
    count(*) filter (where b.status = 'settled') as settled_count,
    count(*) as bets_count,
    coalesce(sum(b.payout_cents), 0) as total_payout_cents,
    coalesce(sum(b.stake_cents) filter (where b.status in ('validated', 'settled')), 0) as total_staked_cents
  from public.bets b
  group by b.user_id
)
select
  lm.league_id,
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  coalesce(bs.total_points, 0) as total_points,
  coalesce(bs.wins, 0) as wins,
  coalesce(bs.losses, 0) as losses,
  coalesce(bs.settled_count, 0) as settled_count,
  coalesce(bs.bets_count, 0) as bets_count,
  coalesce(bs.total_payout_cents, 0) as total_payout_cents,
  coalesce(bs.total_staked_cents, 0) as total_staked_cents,
  rank() over (
    partition by lm.league_id
    order by coalesce(bs.total_points, 0) desc, coalesce(bs.wins, 0) desc, p.created_at asc
  ) as rank
from public.league_members lm
join public.profiles p on p.id = lm.user_id and p.deleted_at is null
left join bet_stats bs on bs.user_id = lm.user_id;

grant select on public.mv_global_standings to authenticated, anon;
grant select on public.mv_league_standings to authenticated, anon;

notify pgrst, 'reload schema';
