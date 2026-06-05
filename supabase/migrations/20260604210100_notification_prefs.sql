-- Notifications + : préférences (types coupés) + notif « vote sur ton sondage ».

-- 1. Préférences par joueur : liste des types de notif qu'il NE veut PAS.
create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  muted_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_self on public.notification_prefs;
create policy notification_prefs_self on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant select, insert, update on public.notification_prefs to authenticated;

-- 2. Notifier le créateur d'un sondage quand quelqu'un vote (1er vote seulement :
--    un changement de vote = ON CONFLICT DO UPDATE → trigger UPDATE, pas INSERT).
create or replace function public.notify_poll_vote()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_creator uuid;
  v_comment uuid;
  v_q text;
  v_voter text;
begin
  select created_by, comment_id, question into v_creator, v_comment, v_q
    from public.chat_polls where id = new.poll_id;
  if v_creator is null or v_creator = new.user_id then
    return new;
  end if;
  select username into v_voter from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, payload)
  values (
    v_creator, 'poll_vote'::notif_type,
    jsonb_build_object(
      'comment_id', v_comment,
      'poll_id', new.poll_id,
      'actor', v_voter,
      'preview', left(coalesce(v_q, ''), 60)
    )
  );
  return new;
end;
$function$;

drop trigger if exists chat_poll_votes_notify on public.chat_poll_votes;
create trigger chat_poll_votes_notify
  after insert on public.chat_poll_votes
  for each row execute function public.notify_poll_vote();

notify pgrst, 'reload schema';
