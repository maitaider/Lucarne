-- =============================================================================
-- Currency configuration: default CAD, with admin override possible.
-- =============================================================================

alter table public.app_settings
  add column if not exists currency char(3) not null default 'CAD';

-- Bump existing row to CAD if still on EUR default and no other config
update public.app_settings
  set currency = 'CAD'
  where id = 1 and currency = 'EUR';

-- Also default real_payments currency to CAD so admin form doesn't need to
-- pass it explicitly
alter table public.real_payments
  alter column currency set default 'CAD';

-- Extend update_app_settings RPC to accept currency
create or replace function public.update_app_settings(
  p_token_price_cents int default null,
  p_buy_in_deadline timestamptz default null,
  p_tournament_start_at timestamptz default null,
  p_tournament_end_at timestamptz default null,
  p_prize_distribution jsonb default null,
  p_scoring_rules jsonb default null,
  p_contact_label text default null,
  p_contact_info text default null,
  p_currency char(3) default null
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
    currency              = coalesce(p_currency, currency),
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
      'currency', p_currency
    )
  );
end;
$$;

revoke all on function public.update_app_settings from public;
grant execute on function public.update_app_settings to authenticated;

-- Enable Supabase Realtime publication for live updates on key tables
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.bets;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.real_payments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table ref.matches;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
