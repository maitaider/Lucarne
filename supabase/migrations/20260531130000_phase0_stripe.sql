-- =============================================================================
-- PHASE 0 — Stripe fulfillment atomicity (M3)
-- Prevent double-credit of a payment (which would inflate the pot): a unique
-- index on the Stripe session reference + a row lock in fulfillment.
-- =============================================================================

-- Backstop: one real_payment per Stripe session reference.
create unique index if not exists real_payments_reference_uq
  on public.real_payments (reference)
  where reference is not null;

create or replace function public.fulfill_stripe_checkout(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkout public.stripe_checkouts%rowtype;
  v_payment_id uuid;
begin
  -- Lock the checkout row so concurrent webhook + return-page calls serialize.
  select * into v_checkout
    from public.stripe_checkouts
   where session_id = p_session_id
   for update;
  if not found then raise exception 'checkout_not_found'; end if;

  -- Idempotent: already fulfilled → return the existing payment.
  if v_checkout.status = 'paid' then
    return v_checkout.real_payment_id;
  end if;

  insert into public.real_payments (
    user_id, amount_cents, currency, method, status,
    reference, note, tokens_credited, recorded_by, received_at
  )
  values (
    v_checkout.user_id, v_checkout.amount_cents, v_checkout.currency, 'other',
    'confirmed', p_session_id, 'Place Coupe du Monde (Stripe)', 0,
    v_checkout.user_id, now()
  )
  on conflict (reference) do nothing
  returning id into v_payment_id;

  -- If the conflict path hit (a concurrent call already inserted), reuse it.
  if v_payment_id is null then
    select id into v_payment_id from public.real_payments where reference = p_session_id;
  end if;

  update public.stripe_checkouts
     set status = 'paid', paid_at = now(), real_payment_id = v_payment_id
   where id = v_checkout.id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    v_checkout.user_id, 'stripe_payment_fulfilled', 'real_payments', v_payment_id,
    jsonb_build_object('session_id', p_session_id, 'amount_cents', v_checkout.amount_cents)
  );

  return v_payment_id;
end;
$$;
