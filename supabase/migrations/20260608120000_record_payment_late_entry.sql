-- Entrée tardive (suite) : l'admin peut enregistrer un paiement manuel APRÈS la
-- date butoire quand late_entry_open est actif (le rail Stripe a déjà été
-- ouvert dans createCheckoutSession). Seul le garde de date est assoupli ;
-- tout le reste de record_payment est inchangé.

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

  if not coalesce(p_allow_duplicate, false) and exists (
    select 1 from public.real_payments
    where user_id = p_user_id and status = 'confirmed'
  ) then
    raise exception 'already_has_access';
  end if;

  select * into v_settings from public.app_settings where id = 1;

  -- Date butoire passée → refus, SAUF si l'entrée tardive est ouverte.
  if v_settings.buy_in_deadline is not null
     and v_settings.buy_in_deadline < now()
     and not coalesce(v_settings.late_entry_open, false) then
    raise exception 'buy_in_deadline_passed';
  end if;

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

notify pgrst, 'reload schema';
