-- Salon — itération 3 : réponses/citations + modération admin (rendre muet).
-- Aucune nouvelle valeur d'enum (les réponses réutilisent `chat_mention` avec
-- payload.kind='reply'), donc un seul fichier de migration.

-- 1. Réponse à un message : reply_to_id pointe le message cité ----------------
alter table public.comments
  add column if not exists reply_to_id uuid
  references public.comments (id) on delete set null;
create index if not exists comments_reply_to_idx
  on public.comments (reply_to_id) where reply_to_id is not null;

-- 2. Mute : un admin empêche un membre de poster dans le Salon -----------------
create table if not exists public.chat_mutes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  muted_by uuid references public.profiles (id) on delete set null,
  reason text,
  until timestamptz,                       -- null = permanent (jusqu'à réactivation)
  created_at timestamptz not null default now()
);
alter table public.chat_mutes enable row level security;
-- Lecture : soi-même (afficher « tu es muet ») ou admin (modérer).
drop policy if exists chat_mutes_select on public.chat_mutes;
create policy chat_mutes_select on public.chat_mutes
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Écriture : via RPC SECURITY DEFINER uniquement (aucune policy write).
grant select on public.chat_mutes to authenticated;

-- 3. throttle_global_chat : bloquer un membre muet, garder l'anti-spam 3 s -----
create or replace function public.throttle_global_chat()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_until timestamptz;
  v_is_muted boolean := false;
begin
  if new.parent_type <> 'global' then
    return new;
  end if;

  -- Mute administrateur (permanent ou daté).
  select true, until into v_is_muted, v_until
    from public.chat_mutes where user_id = new.user_id;
  if v_is_muted and (v_until is null or v_until > now()) then
    raise exception 'chat_muted'
      using hint = 'Un admin t''a rendu muet dans le Salon.';
  end if;

  -- Anti-spam : 1 message / 3 s.
  if exists (
    select 1 from public.comments
     where user_id = new.user_id
       and parent_type = 'global'
       and deleted_at is null
       and created_at > now() - interval '3 seconds'
  ) then
    raise exception 'chat_rate_limited'
      using hint = 'Attends quelques secondes avant de renvoyer un message.';
  end if;

  return new;
end;
$function$;

-- 4. notify_comment : sur le Salon, notifier aussi l'auteur du message cité ----
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor text;
  v_match uuid;
  v_mention text;
  v_uid uuid;
  v_seen uuid[] := '{}';
begin
  select username into v_actor from public.profiles where id = new.user_id;

  -- --- Salon : réponse + @mentions -----------------------------------------
  if new.parent_type = 'global' then
    -- Réponse : notifier l'auteur du message cité (sauf soi-même).
    if new.reply_to_id is not null then
      select user_id into v_uid from public.comments where id = new.reply_to_id;
      if v_uid is not null and v_uid <> new.user_id then
        v_seen := v_seen || v_uid;
        insert into public.notifications (user_id, type, payload)
        values (
          v_uid, 'chat_mention'::notif_type,
          jsonb_build_object(
            'kind', 'reply',
            'comment_id', new.id,
            'actor_id', new.user_id,
            'actor', v_actor,
            'preview', left(new.body, 80)
          )
        );
      end if;
    end if;

    -- @mentions (dédupliquées, ni soi, ni l'auteur déjà notifié en réponse).
    for v_mention in
      select distinct m[1]
      from regexp_matches(new.body, '@([A-Za-z0-9_-]{3,24})', 'g') as m
    loop
      select id into v_uid
        from public.profiles
       where username = v_mention and deleted_at is null;
      if v_uid is null or v_uid = new.user_id or v_uid = any (v_seen) then
        continue;
      end if;
      v_seen := v_seen || v_uid;
      insert into public.notifications (user_id, type, payload)
      values (
        v_uid, 'chat_mention'::notif_type,
        jsonb_build_object(
          'kind', 'mention',
          'comment_id', new.id,
          'actor_id', new.user_id,
          'actor', v_actor,
          'preview', left(new.body, 80)
        )
      );
    end loop;
    return new;
  end if;

  -- --- match / bet / league_feed : fan-out « réponse » (inchangé) -----------
  if new.parent_type = 'match' then
    v_match := new.parent_id;
  elsif new.parent_type = 'bet' then
    select match_id into v_match from public.bets where id = new.parent_id;
  end if;

  insert into public.notifications (user_id, type, payload)
  select distinct r.uid, 'comment_received'::notif_type,
         jsonb_build_object(
           'parent_type', new.parent_type,
           'parent_id', new.parent_id,
           'comment_id', new.id,
           'actor_id', new.user_id,
           'actor', v_actor,
           'preview', left(new.body, 80),
           'match_id', v_match
         )
  from (
    select c.user_id as uid
      from public.comments c
     where c.parent_type = new.parent_type
       and c.parent_id = new.parent_id
       and c.deleted_at is null
       and c.user_id <> new.user_id
    union
    select b.user_id as uid
      from public.bets b
     where new.parent_type = 'bet'
       and b.id = new.parent_id
       and b.user_id <> new.user_id
  ) r
  where r.uid is not null;

  return new;
end;
$function$;

-- 5. RPC admin : rendre muet / réactiver (valeurs contrôlées → definer) --------
create or replace function public.admin_set_chat_mute(
  p_user_id uuid,
  p_muted boolean,
  p_reason text default null,
  p_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if p_muted then
    insert into public.chat_mutes (user_id, muted_by, reason, until)
    values (p_user_id, auth.uid(), p_reason, p_until)
    on conflict (user_id) do update
      set muted_by = excluded.muted_by,
          reason = excluded.reason,
          until = excluded.until,
          created_at = now();
  else
    delete from public.chat_mutes where user_id = p_user_id;
  end if;

  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (
    auth.uid(), 'admin_set_chat_mute', 'chat_mutes', p_user_id,
    jsonb_build_object('muted', p_muted, 'reason', p_reason, 'until', p_until)
  );
end;
$function$;

revoke all on function public.admin_set_chat_mute(uuid, boolean, text, timestamptz) from public;
grant execute on function public.admin_set_chat_mute(uuid, boolean, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
