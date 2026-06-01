-- =============================================================================
-- Admin : gestion complète de l'argent + suppression des joueurs payants
-- -----------------------------------------------------------------------------
-- Retour produit :
--  • L'admin doit pouvoir SUPPRIMER un paiement (corriger une erreur, nettoyer
--    de l'argent de test, ou un remboursement réglé en cash hors-app).
--  • L'admin doit pouvoir purger un joueur MÊME s'il a payé (les FK
--    real_payments.user_id / recorded_by `on delete restrict` bloquaient avant).
-- =============================================================================

-- --- Supprimer un paiement (corriger / nettoyer) ----------------------------
create or replace function public.admin_delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  delete from public.real_payments where id = p_payment_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'delete_payment', 'real_payments', p_payment_id,
    jsonb_build_object(
      'user_id', v_payment.user_id,
      'amount_cents', v_payment.amount_cents,
      'status', v_payment.status,
      'method', v_payment.method
    )
  );
end;
$$;

revoke all on function public.admin_delete_payment(uuid) from public;
grant execute on function public.admin_delete_payment(uuid) to authenticated;

-- --- Purger un joueur, paiements compris ------------------------------------
-- Remplace la version de 20260531270000 : on lève désormais le blocage des
-- paiements en les effaçant (paiements du joueur) et en réassignant ceux qu'il
-- a lui-même enregistrés (recorded_by) à l'admin qui purge. Seule la possession
-- d'une ligue reste bloquante (leagues.owner_id `on delete restrict`).
create or replace function public.admin_purge_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_target_role app_role;
  v_owns_league int;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_purge_self';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'user_not_found';
  end if;
  if v_target_role in ('admin', 'super_admin') and v_role <> 'super_admin' then
    raise exception 'forbidden';
  end if;
  if v_target_role = 'super_admin'
     and (select count(*) from public.profiles
            where role = 'super_admin' and deleted_at is null) <= 1 then
    raise exception 'cannot_remove_last_super_admin';
  end if;

  -- Seul blocage restant : posséder une ligue (sinon orpheline).
  select count(*) into v_owns_league
    from public.leagues where owner_id = p_user_id;
  if v_owns_league > 0 then
    raise exception 'cannot_purge_owns_league';
  end if;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'purge_user', 'profiles', p_user_id,
    jsonb_build_object('role', v_target_role)
  );

  -- Lever les FK `on delete restrict` de real_payments :
  --  - réassigner à l'admin courant les paiements que la cible a enregistrés ;
  --  - effacer les paiements de la cible elle-même.
  update public.real_payments
     set recorded_by = auth.uid()
   where recorded_by = p_user_id;
  delete from public.real_payments where user_id = p_user_id;

  -- Supprime le compte auth → cascade vers public.profiles puis le reste.
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_purge_user(uuid) from public;
grant execute on function public.admin_purge_user(uuid) to authenticated;

notify pgrst, 'reload schema';
