-- =============================================================================
-- ROOT CAUSE: "payment not recognized"
-- ---------------------------------------------------------------------------
-- private.audit_log was created with columns (entity_type, entity_id, diff),
-- but FIVE functions insert into (target_table, target_id, payload):
--   fulfill_stripe_checkout, record_payment, refund_payment, adjust_balance,
--   admin_delete_player, set_user_role, ...
-- Every such INSERT throws `42703 column "target_table" does not exist` and,
-- because these are plpgsql functions, rolls back the ENTIRE transaction.
--
-- For Stripe: confirmStripeCheckout → fulfill_stripe_checkout inserted the
-- real_payment, credited the balance, marked the checkout paid… then hit the
-- audit_log insert, threw, and rolled ALL of it back. Net result: checkout
-- stays 'pending', no real_payment, buy-in never unlocks. Confirmed against a
-- real paid session (status=complete, payment_status=paid).
--
-- The table is internal (private schema) and not read programmatically, so the
-- safe, no-logic-change fix is to add the alternate column names and relax the
-- NOT NULL on entity_type so BOTH naming conventions write successfully.
-- =============================================================================

alter table private.audit_log
  add column if not exists target_table text,
  add column if not exists target_id uuid,
  add column if not exists payload jsonb;

-- entity_type is NOT NULL but the target_* writers don't set it.
alter table private.audit_log alter column entity_type drop not null;
