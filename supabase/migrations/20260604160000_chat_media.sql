-- Salon — itération 5a : partage d'images.
-- Bucket Storage public "chat-media" (calqué sur "avatars") + colonne image_url
-- sur comments. Un message peut désormais avoir un texte ET/OU une image.

-- 1. Bucket --------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media', 'chat-media', true, 8388608,         -- 8 Mo
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique (bucket public).
drop policy if exists "chat_media_public_read" on storage.objects;
create policy "chat_media_public_read" on storage.objects
  for select using (bucket_id = 'chat-media');

-- Chaque membre n'écrit que dans son propre dossier : chat-media/<uid>/<file>
drop policy if exists "chat_media_user_insert" on storage.objects;
create policy "chat_media_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat_media_user_delete" on storage.objects;
create policy "chat_media_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Colonne image_url + CHECK assoupli ---------------------------------------
alter table public.comments add column if not exists image_url text;

-- Un message doit avoir du texte (1..280) OU une image (corps alors optionnel).
-- Inchangé pour match/bet/league_feed (image_url null → texte requis).
alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments
  add constraint comments_body_check
  check (
    char_length(body) <= 280
    and (char_length(body) >= 1 or image_url is not null)
  );

-- 3. File de modération : inclure l'image signalée (drop+recreate car le type
--    de retour change).
drop function if exists public.admin_list_chat_reports();
create function public.admin_list_chat_reports()
returns table (
  comment_id uuid,
  body text,
  image_url text,
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
    c.id, c.body, c.image_url, c.created_at, c.user_id, p.username::text, p.avatar_url,
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
  group by c.id, c.body, c.image_url, c.created_at, c.user_id, p.username, p.avatar_url, c.deleted_at
  order by min(r.created_at) desc;
end;
$function$;
revoke all on function public.admin_list_chat_reports() from public;
grant execute on function public.admin_list_chat_reports() to authenticated;

notify pgrst, 'reload schema';
