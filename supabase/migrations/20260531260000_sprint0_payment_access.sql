-- Sprint 0 — Paiement & accès.
--
-- I-5 — Idempotence du rail de paiement manuel (anti double-crédit du pot).
-- record_payment n'avait aucun garde anti-doublon (pas de client_request_id,
-- l'index unique sur `reference` est partiel et la référence est optionnelle).
-- Deux clics / deux admins → deux lignes `confirmed` → KPI "Argent collecté /
-- Places vendues" et cagnotte projetée gonflés. On refuse un 2ᵉ paiement d'accès
-- si une ligne confirmée existe déjà pour ce joueur, SAUF override explicite
-- (p_allow_duplicate) déclenché par une case à cocher côté admin.
-- On ajoute un paramètre p_allow_duplicate : comme cela change la signature,
-- `create or replace` créerait une SURCHARGE (deux record_payment coexistent →
-- "function is not unique"). On DROP donc explicitement l'ancienne signature
-- 6-arguments avant de recréer la fonction.

drop function if exists public.record_payment(
  uuid, integer, payment_method, character, text, text
);

create or replace function public.record_payment(
  p_user_id uuid,
  p_amount_cents integer,
  p_method payment_method,
  p_currency character default 'CAD'::bpchar,
  p_reference text default null::text,
  p_note text default null::text,
  p_allow_duplicate boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- I-5: idempotency — one confirmed access payment per player unless overridden.
  if not coalesce(p_allow_duplicate, false) and exists (
    select 1 from public.real_payments
    where user_id = p_user_id and status = 'confirmed'
  ) then
    raise exception 'already_has_access';
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
$function$;

-- I-4 — L'accès ne doit PAS dépendre du prix courant.
-- has_paid_buy_in (et getMyBuyInStatus côté app) testaient
-- `amount_cents >= app_settings.buy_in_amount_cents`. Si l'admin monte le prix
-- (20 $ → 30 $) après des paiements, tout payeur à 20 $ perd l'accès en plein
-- tournoi (place_bet → buy_in_required). Or les deux rails valident DÉJÀ le
-- montant à la création (Stripe rejette le sous-paiement ; le manuel est à la
-- discrétion de l'admin). Le bon critère, conforme à CLAUDE.md ("une ligne
-- real_payments confirmed = accès"), est donc : une ligne confirmée existe.

create or replace function public.has_paid_buy_in(p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select case
    when exists (
      select 1 from public.profiles
       where id = p_user_id
         and role in ('admin', 'super_admin')
    ) then true
    when exists (
      select 1
        from public.real_payments rp
       where rp.user_id = p_user_id
         and rp.status = 'confirmed'
    ) then true
    else false
  end;
$function$;
