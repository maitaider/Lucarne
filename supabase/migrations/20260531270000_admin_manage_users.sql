-- =============================================================================
-- PHASE 3 — Gestion des joueurs par l'admin : créer / archiver / restaurer / purger
-- -----------------------------------------------------------------------------
-- La page /admin/users gérait déjà solde + rôle. On ajoute le cycle de vie d'un
-- compte joueur (public.profiles ↔ auth.users) :
--   • admin_archive_user  — soft-delete réversible (deleted_at). Login bloqué via
--     getCurrentUser/login côté app ; sorti des classements (déjà filtrés).
--   • admin_restore_user  — annule l'archivage.
--   • admin_purge_user    — suppression définitive (delete auth.users → cascade).
--     Refusée si le compte a un historique d'argent (real_payments) ou possède
--     une ligue, car ces FK sont `on delete restrict`.
--   • admin_finalize_new_user — appelée après auth.admin.createUser (service-role,
--     côté serveur) pour poser le rôle + auto-join la ligue maison + audit.
--
-- Gardes calquées sur set_user_role (cf. 20260531120000_phase0_security.sql) :
-- caller admin/super_admin ; agir sur un admin/super_admin EXIGE super_admin ;
-- jamais soi-même ; jamais le dernier super_admin. SECURITY DEFINER + audit.
-- NB : les RPC à garde auth.uid() s'appellent via le client AUTHENTIFIÉ de
-- l'admin (le client service-role n'a pas d'auth.uid()).
-- =============================================================================

-- --- Archiver (soft-delete réversible) --------------------------------------
create or replace function public.admin_archive_user(
  p_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_target_role app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_archive_self';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'user_not_found';
  end if;

  -- Seul un super_admin peut archiver un admin ou un super_admin.
  if v_target_role in ('admin', 'super_admin') and v_role <> 'super_admin' then
    raise exception 'forbidden';
  end if;

  -- Ne jamais archiver le dernier super_admin actif.
  if v_target_role = 'super_admin'
     and (select count(*) from public.profiles
            where role = 'super_admin' and deleted_at is null) <= 1 then
    raise exception 'cannot_remove_last_super_admin';
  end if;

  update public.profiles
     set deleted_at = now()
   where id = p_user_id and deleted_at is null;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'archive_user', 'profiles', p_user_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

revoke all on function public.admin_archive_user(uuid, text) from public;
grant execute on function public.admin_archive_user(uuid, text) to authenticated;

-- --- Restaurer ---------------------------------------------------------------
create or replace function public.admin_restore_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_target_role app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'user_not_found';
  end if;
  if v_target_role in ('admin', 'super_admin') and v_role <> 'super_admin' then
    raise exception 'forbidden';
  end if;

  update public.profiles
     set deleted_at = null
   where id = p_user_id;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (auth.uid(), 'restore_user', 'profiles', p_user_id, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_restore_user(uuid) from public;
grant execute on function public.admin_restore_user(uuid) to authenticated;

-- --- Purger (suppression définitive) ----------------------------------------
create or replace function public.admin_purge_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_target_role app_role;
  v_blockers int;
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

  -- Précondition : aucun historique bloqué par une FK `on delete restrict`
  -- (real_payments.user_id, real_payments.recorded_by, leagues.owner_id).
  select
    (select count(*) from public.real_payments where user_id = p_user_id)
    + (select count(*) from public.real_payments where recorded_by = p_user_id)
    + (select count(*) from public.leagues where owner_id = p_user_id)
  into v_blockers;
  if v_blockers > 0 then
    raise exception 'cannot_purge_has_history';
  end if;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'purge_user', 'profiles', p_user_id,
    jsonb_build_object('role', v_target_role)
  );

  -- Supprime le compte auth → cascade vers public.profiles puis tout le reste
  -- (paris, league_members, commentaires, notifs, transactions, predictions…).
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_purge_user(uuid) from public;
grant execute on function public.admin_purge_user(uuid) to authenticated;

-- --- Finaliser un compte créé par l'admin -----------------------------------
-- Appelée via le client AUTHENTIFIÉ de l'admin juste après
-- auth.admin.createUser (service-role). Pose le rôle, auto-join la ligue maison
-- (comme redeem_invitation pour les inscriptions par code), et audite.
create or replace function public.admin_finalize_new_user(
  p_user_id uuid,
  p_role app_role default 'player'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role app_role;
  v_default uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  -- Seul un super_admin peut créer un admin / super_admin.
  if p_role <> 'player' and v_role <> 'super_admin' then
    raise exception 'only_super_admin_can_create_admin';
  end if;

  if p_role <> 'player' then
    update public.profiles set role = p_role where id = p_user_id;
  end if;

  -- Tout nouveau joueur rejoint la ligue maison (par défaut).
  select id into v_default
    from public.leagues
   where is_default and deleted_at is null
   limit 1;
  if v_default is not null then
    insert into public.league_members (league_id, user_id, role)
    values (v_default, p_user_id, 'member')
    on conflict do nothing;
  end if;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'admin_create_user', 'profiles', p_user_id,
    jsonb_build_object('role', p_role)
  );
end;
$$;

revoke all on function public.admin_finalize_new_user(uuid, app_role) from public;
grant execute on function public.admin_finalize_new_user(uuid, app_role) to authenticated;

notify pgrst, 'reload schema';
