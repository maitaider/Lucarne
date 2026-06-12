-- Déblocage des pronos PAR USAGER : l'admin peut redonner une fenêtre de
-- pronostic à un payeur précis (ex. quelqu'un dont la fenêtre de grâce a
-- expiré) via profiles.predictions_unlock_until. my_prediction_deadline()
-- prolonge l'échéance du joueur si ce timestamp est plus tardif. Le contrôle
-- par-match (match déjà commencé) reste actif → seulement les matchs restants.

alter table public.profiles
  add column if not exists predictions_unlock_until timestamptz;

create or replace function public.my_prediction_deadline()
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_global timestamptz := public.global_prediction_deadline();
  v_paid_at timestamptz;
  v_base timestamptz;
  v_unlock timestamptz;
begin
  select received_at into v_paid_at
  from public.real_payments
  where user_id = auth.uid() and status = 'confirmed'
  order by received_at desc
  limit 1;

  if v_paid_at is not null and v_global is not null and v_paid_at >= v_global then
    v_base := v_paid_at + interval '1 hour';   -- entrée tardive (paiement + 1 h)
  else
    v_base := v_global;                         -- payeur normal = verrou global
  end if;

  -- Déblocage admin par usager : prolonge l'échéance si plus tardif.
  select predictions_unlock_until into v_unlock
  from public.profiles where id = auth.uid();

  if v_unlock is not null and (v_base is null or v_unlock > v_base) then
    return v_unlock;
  end if;
  return v_base;
end;
$$;

notify pgrst, 'reload schema';
