-- =============================================================================
-- FIX — refund_payment cassé par le résidu jetons : le remboursement échouait.
-- -----------------------------------------------------------------------------
-- refund_payment insérait encore une ligne `public.transactions` (registre
-- jetons) avec amount_cents = tokens_credited * 100. Or, dans le modèle unifié
-- (accès gratuit scoré en points), tout buy-in a tokens_credited = 0 →
-- amount_cents = 0 → viole la contrainte `transactions_amount_cents_check`
-- (amount_cents > 0) → exception → TOUTE la transaction de remboursement est
-- annulée (rien n'est remboursé). Erreur vue en prod :
--   new row for relation "transactions" violates check constraint
--   "transactions_amount_cents_check"
--
-- Le buy-in est un ACCÈS, pas des jetons. Rembourser = simplement marquer la
-- ligne real_payments 'refunded' (ce qui révoque l'accès, car has_paid_buy_in /
-- getMyBuyInStatus ne comptent que les paiements 'confirmed') + audit. On retire
-- donc la mise à jour de balance_cents ET l'insertion dans transactions (résidu
-- jetons = dette, cf. I-7). NB : le remboursement de l'argent réel se fait à
-- part dans Stripe ; ce RPC ne fait que l'état applicatif.
-- =============================================================================

create or replace function public.refund_payment(
  p_payment_id uuid,
  p_reason text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Accès, pas de jetons : on marque seulement le paiement remboursé. Cela
  -- révoque l'accès (statut ≠ 'confirmed'). Aucune écriture balance_cents /
  -- transactions (résidu jetons qui cassait le remboursement).
  update public.real_payments
     set status = 'refunded',
         refunded_at = now(),
         refund_reason = p_reason
   where id = p_payment_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'refund_payment', 'real_payments', p_payment_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$function$;
