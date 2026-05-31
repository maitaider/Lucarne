-- =============================================================================
-- PHASE 2 — Outillage admin : réponse aux tickets + journal d'audit (item 19)
-- The support loop was one-way (admin could only resolve, never reply). And the
-- audit log lives in the `private` schema (not exposed via PostgREST), so it was
-- unreadable. Two SECURITY DEFINER RPCs fix both.
-- =============================================================================

-- --- Reply to a support ticket (writes admin_note + notifies the player) -----
create or replace function public.admin_reply_ticket(
  p_ticket_id uuid,
  p_note text,
  p_resolve boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_subject text;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'empty_note';
  end if;

  update public.support_tickets
     set admin_note  = p_note,
         status      = case when p_resolve then 'resolved' else status end,
         resolved_at = case when p_resolve then now() else resolved_at end
   where id = p_ticket_id
   returning user_id, subject into v_user, v_subject;
  if not found then
    raise exception 'ticket_not_found';
  end if;

  -- Notify the player that the admin replied (cross-user insert needs definer).
  insert into public.notifications (user_id, type, payload)
  values (
    v_user, 'support_ticket',
    jsonb_build_object('ticket_id', p_ticket_id, 'kind', 'reply', 'subject', v_subject)
  );

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'admin_reply_ticket', 'support_tickets', p_ticket_id,
    jsonb_build_object('resolved', p_resolve)
  );
end;
$$;

revoke all on function public.admin_reply_ticket(uuid, text, boolean) from public;
grant execute on function public.admin_reply_ticket(uuid, text, boolean) to authenticated;

-- --- Read the audit log (admin only; private schema isn't PostgREST-exposed) --
create or replace function public.admin_list_audit_log(p_limit int default 100)
returns table (
  id uuid,
  actor_id uuid,
  actor_username text,
  action text,
  target_table text,
  target_id uuid,
  payload jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  return query
  select
    a.id,
    a.actor_id,
    p.username,
    a.action,
    coalesce(a.target_table, a.entity_type) as target_table,
    coalesce(a.target_id, a.entity_id) as target_id,
    coalesce(a.payload, a.diff) as payload,
    a.created_at
  from private.audit_log a
  left join public.profiles p on p.id = a.actor_id
  order by a.created_at desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.admin_list_audit_log(int) from public;
grant execute on function public.admin_list_audit_log(int) to authenticated;

notify pgrst, 'reload schema';
