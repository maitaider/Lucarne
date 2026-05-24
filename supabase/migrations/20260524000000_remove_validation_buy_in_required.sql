-- =============================================================================
-- Direct-validated bets + paid buy-in gate + 1h kickoff lock
-- =============================================================================
-- Product changes (2026-05-24):
--   1. No more admin validation. Bets land directly with status = 'validated'
--      and are immediately active. All existing pending_payment bets are
--      auto-promoted to 'validated'.
--   2. A user can only place/edit a bet if they have ONE confirmed
--      real_payments row of at least `buy_in_amount_cents` (default 2000
--      = 20 CAD). Admins (admin / super_admin) are exempt.
--   3. The per-match edit lock moves from T-60s to T-1h.
--   4. Buy-in must happen before `tournament_start_at - 1h` (deadline).
--   5. The old admin_validate_bet / admin_reject_bet / admin_mark_payment_received
--      RPCs are dropped; the /admin/validations page is removed in code.
-- =============================================================================

-- 1. New app_settings column: buy_in_amount_cents
alter table public.app_settings
  add column if not exists buy_in_amount_cents int not null default 2000
    check (buy_in_amount_cents > 0);

comment on column public.app_settings.buy_in_amount_cents is
  'Fixed seat price (cents). A user must have a confirmed real_payment >= this amount to bet.';

-- 2. Auto-validate every pending_payment bet (admin validation goes away)
update public.bets
   set status = 'validated', updated_at = now()
 where status in ('pending_payment', 'paid');

-- 3. Helper: has the user paid their seat?
--    Returns true iff there's at least one confirmed real_payments row whose
--    amount covers the configured buy-in. Admins are also true.
create or replace function public.has_paid_buy_in(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.profiles
       where id = p_user_id
         and role in ('admin', 'super_admin')
    ) then true
    when exists (
      select 1
        from public.real_payments rp
        join public.app_settings s on s.id = 1
       where rp.user_id = p_user_id
         and rp.status = 'confirmed'
         and rp.amount_cents >= s.buy_in_amount_cents
    ) then true
    else false
  end;
$$;

revoke all on function public.has_paid_buy_in from public;
grant execute on function public.has_paid_buy_in to authenticated, service_role;

-- 4. place_bet — drop admin-validation path, gate on buy-in, push lock to 1h
create or replace function public.place_bet(
  p_league_id uuid,
  p_match_id uuid,
  p_bet_type bet_type_enum,
  p_payload jsonb,
  p_stake_cents int default 0,
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match ref.matches%rowtype;
  v_settings public.app_settings%rowtype;
  v_role app_role;
  v_id uuid;
  v_existing_active uuid;
  v_existing_idem uuid;
  v_buy_in_deadline timestamptz;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_stake_cents < 0 or p_stake_cents > 100000 then
    raise exception 'invalid_stake';
  end if;

  select * into v_settings from public.app_settings where id = 1;
  select role into v_role from public.profiles where id = auth.uid();

  -- Buy-in gate: admins are exempt; everyone else needs a confirmed payment
  if v_role not in ('admin', 'super_admin') then
    if not public.has_paid_buy_in(auth.uid()) then
      raise exception 'buy_in_required';
    end if;

    -- New entries are also barred once the tournament deadline passes.
    -- Existing payers can keep editing per-match up to T-1h.
    v_buy_in_deadline := coalesce(
      v_settings.buy_in_deadline,
      v_settings.tournament_start_at - interval '1 hour'
    );
    -- (no-op: payers can edit; this used to block new buy-ins, not bets.)
    perform 1 where v_buy_in_deadline is not null;
  end if;

  -- Idempotency by client_request_id (true replay safety)
  if p_client_request_id is not null then
    select id into v_existing_idem
      from public.bets
     where user_id = auth.uid()
       and client_request_id = p_client_request_id;
    if v_existing_idem is not null then
      return v_existing_idem;
    end if;
  end if;

  -- Match validation for match-bound bets — lock 1h before kickoff
  if p_match_id is not null then
    select * into v_match from ref.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.kickoff_at - interval '1 hour' < now() then
      raise exception 'kickoff_too_close';
    end if;
  end if;

  -- League membership check
  if p_league_id is not null then
    if not public.is_league_member(p_league_id) then
      raise exception 'not_a_league_member';
    end if;
  end if;

  -- UPSERT: if user already has an active bet for this match+type, update it
  if p_match_id is not null then
    select id into v_existing_active
      from public.bets
     where user_id = auth.uid()
       and match_id = p_match_id
       and bet_type = p_bet_type
       and status = 'validated';

    if v_existing_active is not null then
      update public.bets
         set payload = p_payload,
             stake_cents = p_stake_cents,
             submitted_at = now(),
             client_request_id = coalesce(p_client_request_id, client_request_id),
             updated_at = now()
       where id = v_existing_active;
      return v_existing_active;
    end if;
  end if;

  insert into public.bets (
    user_id, league_id, match_id, bet_type, payload, stake_cents,
    status, client_request_id, submitted_at
  )
  values (
    auth.uid(), p_league_id, p_match_id, p_bet_type, p_payload, p_stake_cents,
    'validated', p_client_request_id, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.place_bet from public;
grant execute on function public.place_bet to authenticated;

-- 5. Rebuild unique partial index now that pending_payment is no longer a
--    possible status for new bets (settled / validated / rejected only).
drop index if exists bets_one_active_per_match_type;
create unique index bets_one_active_per_match_type
  on public.bets (user_id, match_id, bet_type)
  where status = 'validated'
    and match_id is not null;

-- 6. Retire the admin-validation RPCs entirely (drop every overload).
do $$
declare
  r record;
begin
  for r in
    select format('drop function if exists %s cascade',
                   p.oid::regprocedure::text) as ddl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_validate_bet',
         'admin_reject_bet',
         'admin_mark_payment_received'
       )
  loop
    execute r.ddl;
  end loop;
end $$;

-- Also drop the queue view since the workflow it modeled is gone.
drop view if exists public.admin_bet_validation_queue cascade;

-- 7. The Stripe webhook still flows through fulfill_stripe_checkout(); the
--    only change is that real_payments now also unlocks betting via
--    has_paid_buy_in(). No code change needed there.

-- 8. update_app_settings — accept the new buy_in_amount_cents knob so admins
--    can change the seat price in /admin/economy.
--    Drop the existing overload first so the new signature doesn't clash.
do $$
declare
  r record;
begin
  for r in
    select format('drop function if exists %s cascade',
                   p.oid::regprocedure::text) as ddl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'update_app_settings'
  loop
    execute r.ddl;
  end loop;
end $$;

create function public.update_app_settings(
  p_token_price_cents int default null,
  p_buy_in_deadline timestamptz default null,
  p_tournament_start_at timestamptz default null,
  p_tournament_end_at timestamptz default null,
  p_prize_distribution jsonb default null,
  p_scoring_rules jsonb default null,
  p_contact_label text default null,
  p_contact_info text default null,
  p_buy_in_amount_cents int default null
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

  update public.app_settings
     set token_price_cents   = coalesce(p_token_price_cents, token_price_cents),
         buy_in_deadline     = coalesce(p_buy_in_deadline, buy_in_deadline),
         tournament_start_at = coalesce(p_tournament_start_at, tournament_start_at),
         tournament_end_at   = coalesce(p_tournament_end_at, tournament_end_at),
         prize_distribution  = coalesce(p_prize_distribution, prize_distribution),
         scoring_rules       = coalesce(p_scoring_rules, scoring_rules),
         contact_label       = coalesce(p_contact_label, contact_label),
         contact_info        = coalesce(p_contact_info, contact_info),
         buy_in_amount_cents = coalesce(p_buy_in_amount_cents, buy_in_amount_cents),
         updated_at          = now(),
         updated_by          = auth.uid()
   where id = 1;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'update_app_settings', 'app_settings', null,
    jsonb_build_object(
      'token_price_cents', p_token_price_cents,
      'buy_in_deadline', p_buy_in_deadline,
      'tournament_start_at', p_tournament_start_at,
      'tournament_end_at', p_tournament_end_at,
      'prize_distribution', p_prize_distribution,
      'scoring_rules', p_scoring_rules,
      'contact_info', p_contact_info,
      'buy_in_amount_cents', p_buy_in_amount_cents
    )
  );
end;
$$;

revoke all on function public.update_app_settings from public;
grant execute on function public.update_app_settings to authenticated;

notify pgrst, 'reload schema';
