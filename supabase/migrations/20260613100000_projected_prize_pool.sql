-- Shared projected prize pool — the SAME total for every member.
--
-- Bug: the leaderboard's "Cagnotte projetée" read `admin_overview_stats`, a
-- security_invoker view that aggregates public.real_payments. That table's RLS
-- is `user_id = auth.uid() OR is_admin()`, so a NON-admin only sees their own
-- payment → the projected pot collapsed to that single contribution (admin saw
-- 8000¢ / $80, a player saw just their own ~$10-20). The pot is shared info that
-- every player should see identically.
--
-- Fix: a SECURITY DEFINER aggregate that bypasses the per-row RLS and returns
-- ONLY the totals (sum + distinct payer count) — never any individual amount,
-- so there's no privacy leak. The leaderboard feeds this into computePrizePool.

create or replace function public.projected_prize_pool()
returns table (
  total_collected_cents bigint,
  paying_users_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(amount_cents), 0)::bigint as total_collected_cents,
    count(distinct user_id)::int as paying_users_count
  from public.real_payments
  where status = 'confirmed';
$$;

revoke all on function public.projected_prize_pool() from anon, public;
grant execute on function public.projected_prize_pool() to authenticated, service_role;

comment on function public.projected_prize_pool() is
  'Shared projected prize pool (sum of confirmed real_payments + distinct payer count), identical for every member. SECURITY DEFINER to bypass the per-row real_payments RLS; exposes aggregates only, no individual amounts.';
