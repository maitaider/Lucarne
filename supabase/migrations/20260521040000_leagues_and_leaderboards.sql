-- =============================================================================
-- Lucarne — Leagues RPCs + Leaderboard materialized view
-- =============================================================================

-- Helper to generate human-readable invite codes (LUC-XXXX-XX, base32 readable)
create or replace function private.gen_invitation_code()
returns text
language plpgsql
volatile
as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0,O,1,I,L
  v_code text := '';
  i int;
  v_idx int;
begin
  for i in 1..6 loop
    v_idx := (random() * length(v_alphabet))::int + 1;
    v_code := v_code || substr(v_alphabet, v_idx, 1);
  end loop;
  return 'LUC-' || substr(v_code, 1, 4) || '-' || substr(v_code, 5, 2);
end;
$$;

-- =============================================================================
-- create_league
-- =============================================================================
create or replace function public.create_league(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility league_visibility default 'private',
  p_member_limit int default 50,
  p_allows_real_money boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_league_id uuid;
  v_default_profile uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  if char_length(p_name) < 2 or char_length(p_name) > 50 then
    raise exception 'invalid_name';
  end if;

  if p_slug !~ '^[a-z0-9-]+$' or char_length(p_slug) < 3 then
    raise exception 'invalid_slug';
  end if;

  select id into v_default_profile from public.scoring_profiles where is_default = true limit 1;

  insert into public.leagues (
    name, slug, description, owner_id, visibility, member_limit,
    scoring_profile_id, allows_real_money
  ) values (
    p_name, p_slug, p_description, v_user_id, p_visibility, p_member_limit,
    v_default_profile, p_allows_real_money
  ) returning id into v_league_id;

  insert into public.league_members (league_id, user_id, role)
  values (v_league_id, v_user_id, 'owner');

  insert into private.audit_log (actor_id, action, entity_type, entity_id)
  values (v_user_id, 'create_league', 'league', v_league_id);

  return v_league_id;
end;
$$;

grant execute on function public.create_league to authenticated;

-- =============================================================================
-- generate_invitation
-- =============================================================================
create or replace function public.generate_invitation(
  p_league_id uuid,
  p_expires_days int default 14,
  p_max_uses int default 1
)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_expires timestamptz := now() + (p_expires_days || ' days')::interval;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  -- Must be league owner/admin
  if not exists (
    select 1 from public.league_members
     where league_id = p_league_id and user_id = v_user_id and role in ('owner', 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  if p_expires_days < 1 or p_expires_days > 30 then
    raise exception 'invalid_expiration';
  end if;

  -- Generate unique code (retry on collision)
  loop
    v_code := private.gen_invitation_code();
    begin
      insert into public.invitations (code, league_id, created_by, expires_at, max_uses)
      values (v_code, p_league_id, v_user_id, v_expires, p_max_uses);
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 10 then raise exception 'code_generation_failed'; end if;
    end;
  end loop;

  return query select v_code, v_expires;
end;
$$;

grant execute on function public.generate_invitation to authenticated;

-- =============================================================================
-- Leaderboard materialized view (refreshed by trigger after settle)
-- =============================================================================
create materialized view public.mv_league_standings as
with bet_stats as (
  select
    b.league_id,
    b.user_id,
    coalesce(sum(b.points), 0) as total_points,
    count(*) filter (where b.result = 'won') as wins,
    count(*) filter (where b.result = 'lost') as losses,
    count(*) filter (where b.status = 'settled') as settled_count,
    count(*) as bets_count,
    coalesce(sum(b.payout_cents), 0) as total_payout_cents,
    coalesce(sum(b.stake_cents) filter (where b.status in ('validated', 'settled')), 0) as total_staked_cents
  from public.bets b
  where b.league_id is not null
  group by b.league_id, b.user_id
)
select
  bs.league_id,
  bs.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  bs.total_points,
  bs.wins,
  bs.losses,
  bs.settled_count,
  bs.bets_count,
  bs.total_payout_cents,
  bs.total_staked_cents,
  rank() over (partition by bs.league_id order by bs.total_points desc, bs.wins desc) as rank
from bet_stats bs
join public.profiles p on p.id = bs.user_id;

create unique index mv_league_standings_pk on public.mv_league_standings (league_id, user_id);
create index mv_league_standings_rank_idx on public.mv_league_standings (league_id, rank);

-- Global standings (no league filter)
create materialized view public.mv_global_standings as
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
  bs.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  bs.total_points,
  bs.wins,
  bs.losses,
  bs.settled_count,
  bs.bets_count,
  rank() over (order by bs.total_points desc, bs.wins desc) as rank
from bet_stats bs
join public.profiles p on p.id = bs.user_id
where p.deleted_at is null;

create unique index mv_global_standings_pk on public.mv_global_standings (user_id);
create index mv_global_standings_rank_idx on public.mv_global_standings (rank);

grant select on public.mv_league_standings to authenticated;
grant select on public.mv_global_standings to authenticated;

-- Trigger: refresh standings after a bet is settled
create or replace function public.refresh_standings()
returns trigger
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.mv_league_standings;
  refresh materialized view concurrently public.mv_global_standings;
  return null;
end;
$$;

drop trigger if exists bets_refresh_standings on public.bets;
create trigger bets_refresh_standings
  after update of points, result on public.bets
  for each statement
  execute function public.refresh_standings();
