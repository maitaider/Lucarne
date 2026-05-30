-- =============================================================================
-- The buy-in is ACCESS-ONLY (real money for a seat). It must NOT credit
-- play-money jetons. The previous fulfill_stripe_checkout added
-- tokens_to_credit*100 to profiles.balance_cents AND logged a
-- 'manual_adjustment' transaction (rendered as "Ajustement admin"), bumping new
-- players from 1000 → 1001 jetons. Redefine it to only record the real_payment
-- + mark the checkout paid (no balance change, no transaction), then clean up
-- the erroneous credits already applied.
-- =============================================================================

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
  select * into v_checkout from public.stripe_checkouts where session_id = p_session_id;
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
  returning id into v_payment_id;

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

-- One-time cleanup: remove the erroneous "+1 jeton" buy-in credits and restore
-- affected balances to the signup baseline (1000 jetons = 100000 cents).
delete from public.transactions t
using (select distinct user_id from public.real_payments where status = 'confirmed') a
where t.user_id = a.user_id
  and t.reason = 'manual_adjustment'
  and t.direction = 'credit'
  and t.amount_cents = 100;

update public.profiles p
set balance_cents = 100000
from (select distinct user_id from public.real_payments where status = 'confirmed') a
where p.id = a.user_id
  and p.balance_cents = 100100;
