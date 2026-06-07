-- ===========================================================================
-- Suivi de matchs (calendrier perso) + notifications
-- ---------------------------------------------------------------------------
-- L'utilisateur peut "suivre" des matchs qui l'intéressent. Ils s'affichent
-- dans son dashboard et il reçoit :
--   - une notif RÉSULTAT quand un match suivi se termine (déclencheur, marche
--     en prod sans cron) ;
--   - un RAPPEL au coup d'envoi (RPC appelée par le cron — actif quand
--     CRON_SECRET est configuré).
-- ===========================================================================

create table if not exists public.match_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references ref.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index if not exists match_follows_match_idx
  on public.match_follows (match_id);
create index if not exists match_follows_user_idx
  on public.match_follows (user_id, created_at desc);

alter table public.match_follows enable row level security;

-- L'utilisateur gère uniquement ses propres suivis.
drop policy if exists match_follows_select_own on public.match_follows;
create policy match_follows_select_own on public.match_follows
  for select using (user_id = auth.uid());

drop policy if exists match_follows_insert_own on public.match_follows;
create policy match_follows_insert_own on public.match_follows
  for insert with check (user_id = auth.uid());

drop policy if exists match_follows_delete_own on public.match_follows;
create policy match_follows_delete_own on public.match_follows
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.match_follows to authenticated;

-- Nouveau type de notif : résultat d'un match suivi.
alter type notif_type add value if not exists 'match_result';

-- ---------------------------------------------------------------------------
-- Notif RÉSULTAT : quand un match passe à 'finished', prévient ses followers.
-- (Le filtrage des notifs muettes se fait à la LECTURE via notification_prefs,
--  donc pas de check ici.)
-- ---------------------------------------------------------------------------
create or replace function public.notify_followers_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished' and old.status is distinct from 'finished' then
    insert into public.notifications (user_id, type, payload)
    select f.user_id,
           'match_result'::notif_type,
           jsonb_build_object(
             'match_id', new.id,
             'home_score', new.home_score,
             'away_score', new.away_score
           )
    from public.match_follows f
    where f.match_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_notify_followers on ref.matches;
create trigger matches_notify_followers
  after update on ref.matches
  for each row
  execute function public.notify_followers_match_result();

-- ---------------------------------------------------------------------------
-- Rappel COUP D'ENVOI pour les matchs suivis (idempotent). Appelée par le cron
-- (service-role). Réutilise le type `match_kickoff` avec reason='follow'.
-- ---------------------------------------------------------------------------
create or replace function public.cron_notify_followed_kickoffs(
  p_within_minutes int default 60
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with ins as (
    insert into public.notifications (user_id, type, payload)
    select f.user_id,
           'match_kickoff'::notif_type,
           jsonb_build_object('match_id', m.id, 'reason', 'follow')
    from public.match_follows f
    join ref.matches m on m.id = f.match_id
    where m.kickoff_at > now()
      and m.kickoff_at <= now() + make_interval(mins => p_within_minutes)
      and m.status = 'scheduled'
      and not exists (
        select 1
        from public.notifications n
        where n.user_id = f.user_id
          and n.type = 'match_kickoff'
          and (n.payload ->> 'match_id') = m.id::text
          and (n.payload ->> 'reason') = 'follow'
      )
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

revoke all on function public.cron_notify_followed_kickoffs(int) from public;
grant execute on function public.cron_notify_followed_kickoffs(int) to service_role;

-- ---------------------------------------------------------------------------
-- RPCs côté joueur (auth.uid()) — l'app passe par elles plutôt que par la table.
-- ---------------------------------------------------------------------------
create or replace function public.follow_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  insert into public.match_follows (user_id, match_id)
  values (auth.uid(), p_match_id)
  on conflict (user_id, match_id) do nothing;
end;
$$;

create or replace function public.unfollow_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  delete from public.match_follows
   where user_id = auth.uid() and match_id = p_match_id;
end;
$$;

create or replace function public.my_followed_match_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(match_id), '{}'::uuid[])
    from public.match_follows
   where user_id = auth.uid();
$$;

revoke all on function public.follow_match(uuid) from public;
revoke all on function public.unfollow_match(uuid) from public;
revoke all on function public.my_followed_match_ids() from public;
grant execute on function public.follow_match(uuid) to authenticated;
grant execute on function public.unfollow_match(uuid) to authenticated;
grant execute on function public.my_followed_match_ids() to authenticated;

notify pgrst, 'reload schema';
