-- Classement VIVANT : historiser le classement (1 snapshot/jour/user) pour en
-- déduire l'évolution de rang, les mouvements du jour et la courbe de
-- progression. Aucune notion d'historique n'existait jusqu'ici.

create table if not exists public.standings_snapshots (
  snapshot_date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank int not null,
  points int not null,
  wins int not null default 0,
  created_at timestamptz not null default now(),
  primary key (snapshot_date, user_id)
);

create index if not exists standings_snapshots_user_idx
  on public.standings_snapshots (user_id, snapshot_date);

-- Pas de lecture directe par les rôles API : tout passe par les RPC SECURITY
-- DEFINER ci-dessous (qui n'exposent que des agrégats publics : rang/points).
alter table public.standings_snapshots enable row level security;

-- Rang « affiché » = mv_global_standings SANS le bot, re-rangé. Réutilisé par le
-- snapshot et le calcul de delta pour que les deux soient cohérents.
create or replace view public.standings_ranked as
  select
    user_id,
    total_points,
    wins,
    rank() over (order by total_points desc, wins desc) as rank
  from public.mv_global_standings
  where user_id <> '00000000-0000-0000-0000-00000000b07f';

revoke all on public.standings_ranked from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cron quotidien (service-role) : 1 snapshot/jour/user, upsert idempotent.
-- snapshot_date = date « Toronto » au moment de l'exécution (~04:00 UTC = nuit
-- de Toronto → capture l'état de fin de journée locale).
-- ---------------------------------------------------------------------------
create or replace function public.cron_snapshot_standings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (now() at time zone 'America/Toronto')::date;
  v_count int;
begin
  insert into public.standings_snapshots (snapshot_date, user_id, rank, points, wins)
  select v_date, r.user_id, r.rank, r.total_points, r.wins
  from public.standings_ranked r
  on conflict (snapshot_date, user_id) do update
     set rank = excluded.rank,
         points = excluded.points,
         wins = excluded.wins;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.cron_snapshot_standings() from anon, public, authenticated;
grant execute on function public.cron_snapshot_standings() to service_role;

-- ---------------------------------------------------------------------------
-- Lecture : delta de rang + points des dernières 24 h + max théorique, par
-- joueur. Compare le classement courant au snapshot le plus RÉCENT (pris la
-- nuit → « mouvement du jour »).
-- ---------------------------------------------------------------------------
create or replace function public.standings_deltas()
returns table (
  user_id uuid,
  rank_delta int,   -- prev_rank - rank_courant (positif = monte) ; null = pas d'historique
  points_24h int,   -- points gagnés depuis le dernier snapshot
  max_possible int  -- points actuels + 13 par prono encore en jeu (match non terminé)
)
language sql
stable
security definer
set search_path = public
as $$
  with latest_prev as (
    select distinct on (ss.user_id)
      ss.user_id, ss.rank as prev_rank, ss.points as prev_points
    from public.standings_snapshots ss
    order by ss.user_id, ss.snapshot_date desc
  ),
  pending as (
    select b.user_id, count(*) as n
    from public.bets b
    join ref.matches m on m.id = b.match_id
    where b.status = 'validated' and m.status <> 'finished'
    group by b.user_id
  )
  select
    r.user_id,
    case when lp.prev_rank is null then null else lp.prev_rank - r.rank end,
    coalesce(r.total_points - lp.prev_points, 0),
    r.total_points + coalesce(p.n, 0) * 13
  from public.standings_ranked r
  left join latest_prev lp on lp.user_id = r.user_id
  left join pending p on p.user_id = r.user_id;
$$;
revoke all on function public.standings_deltas() from anon;
grant execute on function public.standings_deltas() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mouvements du jour : plus forte montée, plus forte chute, meilleur pointeur
-- (24 h). 0–3 lignes (kind = 'climb' | 'drop' | 'scorer'). Identités publiques.
-- ---------------------------------------------------------------------------
create or replace function public.daily_movements()
returns table (
  kind text,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  value int
)
language sql
stable
security definer
set search_path = public
as $$
  with d as (select * from public.standings_deltas()),
  climb as (
    select 'climb'::text as kind, d.user_id, d.rank_delta as value
    from d where d.rank_delta is not null and d.rank_delta > 0
    order by d.rank_delta desc, d.points_24h desc limit 1
  ),
  faller as (
    select 'drop'::text as kind, d.user_id, d.rank_delta as value
    from d where d.rank_delta is not null and d.rank_delta < 0
    order by d.rank_delta asc limit 1
  ),
  scorer as (
    select 'scorer'::text as kind, d.user_id, d.points_24h as value
    from d where d.points_24h > 0
    order by d.points_24h desc limit 1
  ),
  best as (
    select * from climb union all select * from faller union all select * from scorer
  )
  select b.kind, b.user_id, pr.username::text, pr.display_name, pr.avatar_url, b.value
  from best b
  join public.profiles pr on pr.id = b.user_id;
$$;
revoke all on function public.daily_movements() from anon;
grant execute on function public.daily_movements() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Courbe de progression d'un joueur : points par jour (pour le profil public).
-- ---------------------------------------------------------------------------
create or replace function public.user_points_history(p_username text)
returns table (snapshot_date date, points int)
language sql
stable
security definer
set search_path = public
as $$
  select ss.snapshot_date, ss.points
  from public.standings_snapshots ss
  join public.profiles pr on pr.id = ss.user_id
  where pr.username = p_username
  order by ss.snapshot_date asc;
$$;
revoke all on function public.user_points_history(text) from anon;
grant execute on function public.user_points_history(text) to authenticated, service_role;

-- Backfill best-effort : un snapshot initial daté d'aujourd'hui (les deltas
-- réels commencent au prochain passage du cron).
select public.cron_snapshot_standings();

notify pgrst, 'reload schema';
