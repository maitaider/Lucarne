-- Salon — itération 4 : signalement de message + file de modération admin.

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  unique (comment_id, reporter_id)            -- 1 signalement par membre et par message
);
create index if not exists chat_reports_open_idx
  on public.chat_reports (created_at desc) where resolved_at is null;

alter table public.chat_reports enable row level security;
-- Lecture : admin uniquement (la file de modération). Écriture : via RPC definer.
drop policy if exists chat_reports_select on public.chat_reports;
create policy chat_reports_select on public.chat_reports
  for select to authenticated using (public.is_admin());
grant select on public.chat_reports to authenticated;

-- Signaler un message du Salon (tout membre connecté) -------------------------
create or replace function public.report_chat_message(
  p_comment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  select parent_type into v_parent
    from public.comments where id = p_comment_id and deleted_at is null;
  if v_parent is distinct from 'global' then
    raise exception 'not_found';
  end if;
  insert into public.chat_reports (comment_id, reporter_id, reason)
  values (p_comment_id, auth.uid(), p_reason)
  on conflict (comment_id, reporter_id) do nothing;
end;
$function$;
revoke all on function public.report_chat_message(uuid, text) from public;
grant execute on function public.report_chat_message(uuid, text) to authenticated;

-- File des signalements ouverts (admin) : message + auteur + nb signalements ---
create or replace function public.admin_list_chat_reports()
returns table (
  comment_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  author_muted boolean,
  report_count bigint,
  reasons text[],
  first_reported_at timestamptz,
  message_deleted boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  return query
  select
    c.id, c.body, c.created_at, c.user_id, p.username::text, p.avatar_url,
    exists (
      select 1 from public.chat_mutes cm
      where cm.user_id = c.user_id and (cm.until is null or cm.until > now())
    ),
    count(r.*),
    array_remove(array_agg(r.reason), null),
    min(r.created_at),
    (c.deleted_at is not null)
  from public.chat_reports r
  join public.comments c on c.id = r.comment_id
  join public.profiles p on p.id = c.user_id
  where r.resolved_at is null
  group by c.id, c.body, c.created_at, c.user_id, p.username, p.avatar_url, c.deleted_at
  order by min(r.created_at) desc;
end;
$function$;
revoke all on function public.admin_list_chat_reports() from public;
grant execute on function public.admin_list_chat_reports() to authenticated;

-- Classer (résoudre) tous les signalements d'un message (admin) ---------------
create or replace function public.admin_resolve_chat_report(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  update public.chat_reports
     set resolved_at = now(), resolved_by = auth.uid()
   where comment_id = p_comment_id and resolved_at is null;
  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (auth.uid(), 'admin_resolve_chat_report', 'chat_reports', p_comment_id, '{}'::jsonb);
end;
$function$;
revoke all on function public.admin_resolve_chat_report(uuid) from public;
grant execute on function public.admin_resolve_chat_report(uuid) to authenticated;

notify pgrst, 'reload schema';
