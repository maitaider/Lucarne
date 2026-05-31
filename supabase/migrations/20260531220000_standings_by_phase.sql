-- =============================================================================
-- Phase 3 item B (sous-lot 2) — classement global filtré par phase / journée
-- =============================================================================
-- Même forme que `mv_global_standings`, mais les points ne comptent que pour les
-- matchs de la phase (et, en phase de groupes, de la journée) demandée.
--   * p_stage  : 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
--                (NULL ⇒ aucune restriction de phase).
--   * p_matchday : 1|2|3 pour la phase de groupes (NULL ⇒ toutes les journées).
-- La journée de groupe est dérivée chronologiquement (2 matchs par groupe et par
-- journée). SECURITY DEFINER comme les vues de classement (agrège les points de
-- tous les joueurs) ; grant `authenticated` seulement (pas d'anon, cf. C2).
-- =============================================================================

create or replace function public.standings_filtered(
  p_stage text default null,
  p_matchday int default null
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  role text,
  total_points int,
  wins int,
  losses int,
  settled_count int,
  bets_count int,
  rank int
)
language sql
stable
security definer
set search_path = public
as $$
  with md as (
    select
      m.id,
      m.stage::text as stage,
      case when m.stage = 'group'
           then ceil(
             (row_number() over (
                partition by m.group_label
                order by m.kickoff_at, m.match_number
              ))::numeric / 2
           )::int
           else null end as matchday
    from ref.matches m
  ),
  filt as (
    select id from md
    where (p_stage is null or stage = p_stage)
      and (p_matchday is null or matchday = p_matchday)
  ),
  bet_stats as (
    select
      b.user_id,
      coalesce(sum(b.points), 0) as total_points,
      count(*) filter (where b.result = 'won') as wins,
      count(*) filter (where b.result = 'lost') as losses,
      count(*) filter (where b.status = 'settled') as settled_count,
      count(*) as bets_count
    from public.bets b
    where b.match_id in (select id from filt)
    group by b.user_id
  )
  select
    p.id,
    p.username::text,
    p.display_name,
    p.avatar_url,
    p.role::text,
    coalesce(bs.total_points, 0)::int,
    coalesce(bs.wins, 0)::int,
    coalesce(bs.losses, 0)::int,
    coalesce(bs.settled_count, 0)::int,
    coalesce(bs.bets_count, 0)::int,
    rank() over (
      order by coalesce(bs.total_points, 0) desc,
               coalesce(bs.wins, 0) desc,
               p.created_at asc
    )::int
  from public.profiles p
  left join bet_stats bs on bs.user_id = p.id
  where p.deleted_at is null
  order by rank;
$$;

revoke all on function public.standings_filtered(text, int) from public;
grant execute on function public.standings_filtered(text, int) to authenticated;

notify pgrst, 'reload schema';
