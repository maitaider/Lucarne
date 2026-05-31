-- =============================================================================
-- PHASE 0 — Économie éditable (M1)
-- Re-expose the access price (buy_in_amount_cents) and currency as admin-
-- editable. buy_in_amount_cents already existed as a param; currency was never
-- settable. Adding a param changes the function signature, so drop the old
-- overload first to avoid PostgREST "could not choose best candidate".
-- =============================================================================

drop function if exists public.update_app_settings(
  int, timestamptz, timestamptz, timestamptz, jsonb, jsonb, text, text, int
);

create function public.update_app_settings(
  p_token_price_cents int default null,
  p_buy_in_deadline timestamptz default null,
  p_tournament_start_at timestamptz default null,
  p_tournament_end_at timestamptz default null,
  p_prize_distribution jsonb default null,
  p_scoring_rules jsonb default null,
  p_contact_label text default null,
  p_contact_info text default null,
  p_buy_in_amount_cents int default null,
  p_currency text default null
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

  if p_currency is not null and char_length(p_currency) <> 3 then
    raise exception 'invalid_currency';
  end if;
  if p_buy_in_amount_cents is not null and p_buy_in_amount_cents < 100 then
    raise exception 'invalid_buy_in_amount';
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
         currency            = coalesce(upper(p_currency), currency),
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
      'buy_in_amount_cents', p_buy_in_amount_cents,
      'currency', upper(p_currency)
    )
  );
end;
$$;

revoke all on function public.update_app_settings from public;
grant execute on function public.update_app_settings to authenticated;

notify pgrst, 'reload schema';
