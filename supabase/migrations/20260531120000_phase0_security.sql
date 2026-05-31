-- =============================================================================
-- PHASE 0 — Sécurité (C1, C2, gardes admin)
-- =============================================================================

-- --- C1: privilege-escalation / balance tampering -------------------------
-- A prior migration granted UPDATE on every public table to `authenticated`;
-- combined with the row-level `profiles_update_self` policy, a player could
-- PATCH their own profile to set role='super_admin' or an arbitrary balance.
-- Lock UPDATE to a safe column whitelist (admin RPCs run SECURITY DEFINER and
-- are unaffected). role / balance_cents / total_* are no longer client-writable.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, locale, timezone, transparency_opt_in)
  on public.profiles to authenticated;

-- --- C2: standings leak ----------------------------------------------------
-- The standings views are SECURITY DEFINER (needed to aggregate every player's
-- bets into points). Remove anon access (the app is private/login-gated) and
-- restrict the per-league view to leagues the caller actually belongs to, so a
-- member can't read another private league's roster/points.
revoke select on public.mv_global_standings from anon;
revoke select on public.mv_league_standings from anon;

create or replace view public.mv_league_standings as
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
  p.role,
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
left join bet_stats bs on bs.user_id = lm.user_id
where lm.league_id in (
  select league_id from public.league_members where user_id = auth.uid()
);

grant select on public.mv_league_standings to authenticated;

-- --- Admin guard: don't let the last super_admin lock themselves out -------
create or replace function public.set_user_role(
  p_user_id uuid,
  p_new_role app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_target_role app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;
  if v_role = 'admin' and p_new_role = 'super_admin' then
    raise exception 'only_super_admin_can_create_super_admin';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;

  -- Never demote the last remaining super_admin (lock-out protection).
  if v_target_role = 'super_admin' and p_new_role <> 'super_admin'
     and (select count(*) from public.profiles
            where role = 'super_admin' and deleted_at is null) <= 1 then
    raise exception 'cannot_remove_last_super_admin';
  end if;

  -- Don't let a super_admin demote themselves.
  if p_user_id = auth.uid() and v_role = 'super_admin' and p_new_role <> 'super_admin' then
    raise exception 'cannot_demote_self';
  end if;

  update public.profiles set role = p_new_role where id = p_user_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'set_user_role', 'profiles', p_user_id,
    jsonb_build_object('new_role', p_new_role)
  );
end;
$$;

revoke all on function public.set_user_role from public;
grant execute on function public.set_user_role to authenticated;

notify pgrst, 'reload schema';
