-- =============================================================================
-- FIX CRITIQUE — fulfill_stripe_checkout cassé : tout paiement Stripe échouait à
-- débloquer l'accès.
-- -----------------------------------------------------------------------------
-- L'index unique sur real_payments(reference) est PARTIEL :
--   real_payments_reference_uq … (reference) WHERE (reference IS NOT NULL)
-- Or fulfill_stripe_checkout faisait `on conflict (reference) do nothing` SANS le
-- prédicat → Postgres ne peut pas inférer l'index partiel et lève :
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- → l'INSERT real_payments échoue → confirmStripeCheckout renvoie `fulfill_failed`
-- (et le webhook renvoie 500) → la ligne real_payments confirmée n'est jamais
-- créée → has_paid_buy_in reste false → accès jamais débloqué.
-- Reproduit en local (DB identique à la prod). Bug latent depuis l'ajout de
-- l'index partiel (Phase 0), révélé par le 1er vrai paiement live.
--
-- Correctif : spécifier le prédicat de l'index partiel dans le ON CONFLICT.
-- Seule ligne changée vs la définition live :
--   on conflict (reference) do nothing
--     →  on conflict (reference) where reference is not null do nothing
-- =============================================================================

create or replace function public.fulfill_stripe_checkout(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  on conflict (reference) where reference is not null do nothing
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
$function$;
