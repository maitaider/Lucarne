-- =============================================================================
-- PHASE 1 — Unifier les deux rails de paiement (M4)
-- The buy-in is ACCESS-ONLY (real money for a seat), scored game is free in
-- points. Stripe already records a real_payments row and credits 0 jetons.
-- The manual admin rail diverged: it computed jetons from amount/token_price,
-- credited profiles.balance_cents, and inserted a transactions row. Align it to
-- Stripe: just record a confirmed real_payments row, credit nothing.
-- =============================================================================

create or replace function public.record_payment(
  p_user_id uuid,
  p_amount_cents int,
  p_method payment_method,
  p_currency char(3) default 'CAD',
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
  v_payment_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  if p_amount_cents <= 0 then
    raise exception 'amount_too_low';
  end if;

  select * into v_settings from public.app_settings where id = 1;

  if v_settings.buy_in_deadline is not null
     and v_settings.buy_in_deadline < now() then
    raise exception 'buy_in_deadline_passed';
  end if;

  -- Access payment: record only. No jetons, no balance change, no ledger row
  -- (predictions are free and scored in points).
  insert into public.real_payments (
    user_id, amount_cents, currency, method, status,
    reference, note, tokens_credited, recorded_by
  )
  values (
    p_user_id, p_amount_cents, upper(p_currency), p_method, 'confirmed',
    p_reference, p_note, 0, auth.uid()
  )
  returning id into v_payment_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(),
    'record_payment',
    'real_payments',
    v_payment_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'amount_cents', p_amount_cents,
      'method', p_method
    )
  );

  return v_payment_id;
end;
$$;

notify pgrst, 'reload schema';
