-- =============================================================================
-- Support tickets: users open a ticket to reach the admin; all admins get a
-- notification (bell) on every new ticket.
-- =============================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 120),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_status_idx on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

-- A user creates + reads their own tickets; admins read all + update (resolve).
create policy "support_insert_self" on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "support_select_own_or_admin" on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "support_update_admin" on public.support_tickets
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;

-- Notify every admin when a ticket is opened.
create or replace function public.tg_support_ticket_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select p.id,
         'support_ticket'::notif_type,
         jsonb_build_object('ticket_id', new.id, 'subject', new.subject, 'from_user', new.user_id)
    from public.profiles p
   where p.role in ('admin', 'super_admin')
     and p.deleted_at is null;
  return new;
end;
$$;

drop trigger if exists support_tickets_notify on public.support_tickets;
create trigger support_tickets_notify
  after insert on public.support_tickets
  for each row execute function public.tg_support_ticket_notify();

notify pgrst, 'reload schema';
