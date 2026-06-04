-- Salon (chat global temps réel) — 2/2 : schéma + temps réel + garde-fous.
--
-- Approche low-code : on RÉUTILISE public.comments comme support de messages,
-- avec un nouveau parent_type 'global' (parent_id = UUID sentinelle côté app).
-- On hérite ainsi gratuitement de :
--   - la RLS existante : comments_select_all (authenticated, deleted_at is null)
--     + comments_insert_self (authenticated, user_id = auth.uid()) → lecture
--     membres connectés / écriture = soi. anon n'a AUCUNE policy → refusé.
--   - delete_comment(uuid) (SECURITY DEFINER, auteur OU admin) → modération.
--   - reactions(target_type='comment') + notify_reaction → réactions + notif.
-- On ajoute ici : type 'global' autorisé, messages épinglés (admin), temps réel,
-- notifications @mention (sans fan-out « réponse »), et un throttle anti-spam
-- côté DB (Upstash absent en prod).

-- 1. Autoriser le Salon comme parent de commentaire ---------------------------
alter table public.comments drop constraint if exists comments_parent_type_check;
alter table public.comments
  add constraint comments_parent_type_check
  check (parent_type in ('match', 'bet', 'league_feed', 'global'));

-- 2. Messages épinglés (admin) — colonnes additives, ignorées par les autres
--    usages de comments (match/bet/league_feed).
alter table public.comments
  add column if not exists pinned_at timestamptz;
alter table public.comments
  add column if not exists pinned_by uuid references public.profiles (id) on delete set null;

-- Index partiels : lecture du fil + throttle par utilisateur, sans peser sur
-- les autres parent_type.
create index if not exists comments_global_recent_idx
  on public.comments (parent_id, created_at desc)
  where parent_type = 'global';
create index if not exists comments_global_user_recent_idx
  on public.comments (user_id, created_at desc)
  where parent_type = 'global';

-- 3. Temps réel : diffuser les inserts (nouveaux messages) et les updates
--    (épinglage) du Salon. anon/authenticated ont déjà SELECT sur comments ;
--    la RLS filtre la livraison (un soft-delete passe la ligne à invisible →
--    l'event UPDATE n'est pas livré, géré côté client par broadcast).
do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;

-- 4. notify_comment : pour le Salon, NE PAS notifier tous les commentateurs
--    précédents (ce serait du spam à chaque message — un seul fil global) ;
--    notifier uniquement les membres explicitement @mentionnés. Les autres
--    parent_type gardent le fan-out « réponse » d'origine, inchangé.
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

  -- --- Salon : @mentions seulement -----------------------------------------
  if new.parent_type = 'global' then
    for v_mention in
      select distinct m[1]
      from regexp_matches(new.body, '@([A-Za-z0-9_-]{3,24})', 'g') as m
    loop
      select id into v_uid
        from public.profiles
       where username = v_mention      -- citext → insensible à la casse
         and deleted_at is null;
      -- inconnu, soi-même, ou déjà notifié dans ce message → ignorer
      if v_uid is null or v_uid = new.user_id or v_uid = any (v_seen) then
        continue;
      end if;
      v_seen := v_seen || v_uid;
      insert into public.notifications (user_id, type, payload)
      values (
        v_uid, 'chat_mention'::notif_type,
        jsonb_build_object(
          'comment_id', new.id,
          'actor_id', new.user_id,
          'actor', v_actor,
          'preview', left(new.body, 80)
        )
      );
    end loop;
    return new;
  end if;

  -- --- match / bet / league_feed : fan-out « réponse » (comportement existant)
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

-- 5. Anti-spam : 1 message / 3 s par utilisateur dans le Salon (Upstash absent
--    en prod). BEFORE INSERT, scopé au seul parent_type 'global'.
create or replace function public.throttle_global_chat()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.parent_type <> 'global' then
    return new;
  end if;
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

drop trigger if exists comments_throttle_global on public.comments;
create trigger comments_throttle_global
  before insert on public.comments
  for each row execute function public.throttle_global_chat();

-- 6. Épingler / désépingler un message du Salon (admin uniquement → valeurs
--    contrôlées serveur, SECURITY DEFINER comme les autres écritures admin).
create or replace function public.admin_set_comment_pin(
  p_comment_id uuid,
  p_pinned boolean
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
  update public.comments
     set pinned_at = case when p_pinned then now() else null end,
         pinned_by = case when p_pinned then auth.uid() else null end
   where id = p_comment_id
     and parent_type = 'global'
     and deleted_at is null;
end;
$function$;

revoke all on function public.admin_set_comment_pin(uuid, boolean) from public;
grant execute on function public.admin_set_comment_pin(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
