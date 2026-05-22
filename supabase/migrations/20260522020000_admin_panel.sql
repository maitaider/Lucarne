-- =============================================================================
-- Lucarne — Admin panel: real-money tracking + economy config + user mgmt
-- =============================================================================

do $$ begin
  create type payment_method as enum (
    'cash', 'transfer', 'paypal', 'revolut', 'lydia', 'wise', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'pending', 'confirmed', 'refunded', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 1. App settings — single-row config
-- -----------------------------------------------------------------------------

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  token_price_cents int not null default 100 check (token_price_cents > 0),
  buy_in_deadline timestamptz,
  tournament_start_at timestamptz not null default '2026-06-11T20:00:00Z',
  tournament_end_at timestamptz not null default '2026-07-19T21:00:00Z',
  prize_distribution jsonb not null default '{
    "shares": [50, 30, 20],
    "house_rake_pct": 0,
    "description_fr": "50% au champion · 30% au 2ᵉ · 20% au 3ᵉ",
    "description_en": "50% to champion · 30% to 2nd · 20% to 3rd"
  }'::jsonb,
  scoring_rules jsonb not null default '{
    "match_winner": 2,
    "exact_score": 8,
    "first_scorer": 6,
    "anytime_scorer": 3,
    "both_teams_score": 2,
    "over_under": 2.5,
    "tournament_winner": 20,
    "top_scorer": 15
  }'::jsonb,
  contact_label text default 'Lucarne Admin',
  contact_info text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin"
  on public.app_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Real payments ledger
-- -----------------------------------------------------------------------------

create table if not exists public.real_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents int not null check (amount_cents > 0),
  currency char(3) not null default 'EUR',
  method payment_method not null,
  status payment_status not null default 'confirmed',
  reference text,
  note text,
  tokens_credited int not null default 0 check (tokens_credited >= 0),
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  received_at timestamptz not null default now(),
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists real_payments_user_idx on public.real_payments (user_id, received_at desc);
create index if not exists real_payments_status_idx on public.real_payments (status) where status <> 'cancelled';

drop trigger if exists real_payments_set_updated_at on public.real_payments;
create trigger real_payments_set_updated_at
  before update on public.real_payments
  for each row execute function public.set_updated_at();

alter table public.real_payments enable row level security;

drop policy if exists "real_payments_select_self_or_admin" on public.real_payments;
create policy "real_payments_select_self_or_admin"
  on public.real_payments for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "real_payments_admin_write" on public.real_payments;
create policy "real_payments_admin_write"
  on public.real_payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. RPCs
-- -----------------------------------------------------------------------------

create or replace function public.record_payment(
  p_user_id uuid,
  p_amount_cents int,
  p_method payment_method,
  p_currency char(3) default 'EUR',
  p_reference text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_settings public.app_settings%rowtype;
  v_tokens int;
  v_payment_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  select * into v_settings from public.app_settings where id = 1;

  if v_settings.buy_in_deadline is not null
     and v_settings.buy_in_deadline < now() then
    raise exception 'buy_in_deadline_passed';
  end if;

  v_tokens := (p_amount_cents / v_settings.token_price_cents);
  if v_tokens <= 0 then
    raise exception 'amount_too_low';
  end if;

  insert into public.real_payments (
    user_id, amount_cents, currency, method, status,
    reference, note, tokens_credited, recorded_by
  )
  values (
    p_user_id, p_amount_cents, p_currency, p_method, 'confirmed',
    p_reference, p_note, v_tokens, auth.uid()
  )
  returning id into v_payment_id;

  update public.profiles
     set balance_cents = balance_cents + (v_tokens * 100)
   where id = p_user_id;

  insert into public.transactions (
    user_id, direction, amount_cents, reason, balance_after_cents
  )
  select
    p_user_id,
    'credit'::transaction_direction,
    v_tokens * 100,
    'manual_adjustment'::transaction_reason,
    p.balance_cents
  from public.profiles p
  where p.id = p_user_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(),
    'record_payment',
    'real_payments',
    v_payment_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'amount_cents', p_amount_cents,
      'tokens', v_tokens,
      'method', p_method
    )
  );

  return v_payment_id;
end;
$$;

revoke all on function public.record_payment from public;
grant execute on function public.record_payment to authenticated;

create or replace function public.refund_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_payment public.real_payments%rowtype;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  select * into v_payment from public.real_payments where id = p_payment_id;
  if not found then raise exception 'payment_not_found'; end if;
  if v_payment.status <> 'confirmed' then raise exception 'payment_not_confirmed'; end if;

  update public.real_payments
     set status = 'refunded',
         refunded_at = now(),
         refund_reason = p_reason
   where id = p_payment_id;

  update public.profiles
     set balance_cents = greatest(balance_cents - (v_payment.tokens_credited * 100), 0)
   where id = v_payment.user_id;

  insert into public.transactions (
    user_id, direction, amount_cents, reason, balance_after_cents
  )
  select
    v_payment.user_id,
    'debit'::transaction_direction,
    v_payment.tokens_credited * 100,
    'bet_refund'::transaction_reason,
    p.balance_cents
  from public.profiles p
  where p.id = v_payment.user_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'refund_payment', 'real_payments', p_payment_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

revoke all on function public.refund_payment from public;
grant execute on function public.refund_payment to authenticated;

create or replace function public.adjust_balance(
  p_user_id uuid,
  p_delta_tokens int,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_delta_cents int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  v_delta_cents := p_delta_tokens * 100;

  update public.profiles
     set balance_cents = greatest(balance_cents + v_delta_cents, 0)
   where id = p_user_id;

  insert into public.transactions (
    user_id, direction, amount_cents, reason, balance_after_cents
  )
  select
    p_user_id,
    case when p_delta_tokens >= 0 then 'credit'::transaction_direction
         else 'debit'::transaction_direction end,
    abs(v_delta_cents),
    'manual_adjustment'::transaction_reason,
    p.balance_cents
  from public.profiles p
  where p.id = p_user_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'adjust_balance', 'profiles', p_user_id,
    jsonb_build_object('delta_tokens', p_delta_tokens, 'reason', p_reason)
  );
end;
$$;

revoke all on function public.adjust_balance from public;
grant execute on function public.adjust_balance to authenticated;

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
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then raise exception 'forbidden'; end if;
  if v_role = 'admin' and p_new_role = 'super_admin' then
    raise exception 'only_super_admin_can_create_super_admin';
  end if;
  if v_role <> 'super_admin' and v_role <> 'admin' then
    raise exception 'forbidden';
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

create or replace function public.update_app_settings(
  p_token_price_cents int default null,
  p_buy_in_deadline timestamptz default null,
  p_tournament_start_at timestamptz default null,
  p_tournament_end_at timestamptz default null,
  p_prize_distribution jsonb default null,
  p_scoring_rules jsonb default null,
  p_contact_label text default null,
  p_contact_info text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  update public.app_settings set
    token_price_cents     = coalesce(p_token_price_cents, token_price_cents),
    buy_in_deadline       = coalesce(p_buy_in_deadline, buy_in_deadline),
    tournament_start_at   = coalesce(p_tournament_start_at, tournament_start_at),
    tournament_end_at     = coalesce(p_tournament_end_at, tournament_end_at),
    prize_distribution    = coalesce(p_prize_distribution, prize_distribution),
    scoring_rules         = coalesce(p_scoring_rules, scoring_rules),
    contact_label         = coalesce(p_contact_label, contact_label),
    contact_info          = coalesce(p_contact_info, contact_info),
    updated_at            = now(),
    updated_by            = auth.uid()
  where id = 1;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'update_app_settings', 'app_settings', null,
    jsonb_build_object(
      'token_price_cents', p_token_price_cents,
      'buy_in_deadline', p_buy_in_deadline,
      'prize_distribution', p_prize_distribution,
      'scoring_rules', p_scoring_rules
    )
  );
end;
$$;

revoke all on function public.update_app_settings from public;
grant execute on function public.update_app_settings to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Overview view for admin dashboard
-- -----------------------------------------------------------------------------

create or replace view public.admin_overview_stats as
select
  coalesce(sum(case when status = 'confirmed' then amount_cents end), 0)::bigint as total_collected_cents,
  coalesce(sum(case when status = 'refunded' then amount_cents end), 0)::bigint as total_refunded_cents,
  coalesce(count(*) filter (where status = 'confirmed'), 0)::int as payment_count,
  coalesce(count(distinct user_id) filter (where status = 'confirmed'), 0)::int as paying_users_count
from public.real_payments;

grant select on public.admin_overview_stats to authenticated;
alter view public.admin_overview_stats set (security_invoker = on);
