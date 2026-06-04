-- Salon — itération 5c : bot de résultats.
-- Un "membre système" (salon-bot) poste automatiquement le score final dans le
-- Salon quand un match passe à 'finished'.

-- 1. Seed du bot via auth.users + raw_user_meta_data → handle_new_user crée le
--    profil (username/display_name). Pas besoin de session_replication_role
--    (risqué sur Supabase hébergé). UUID fixe = b07f ("bot").
insert into auth.users (id, email, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-00000000b07f',
  'salon-bot@lucarne.internal',
  '{"username":"salon-bot","display_name":"Salon","locale":"fr"}'::jsonb
)
on conflict (id) do nothing;

-- Le bot ne joue pas : retirer le bonus d'inscription parasite (résidu jetons).
delete from public.transactions where user_id = '00000000-0000-0000-0000-00000000b07f';
update public.profiles set balance_cents = 0
  where id = '00000000-0000-0000-0000-00000000b07f';

-- 2. throttle_global_chat : laisser passer le bot (sinon 2 matchs finis en < 3 s
--    feraient échouer l'UPDATE du 2ᵉ match).
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
  -- Le bot système n'est ni mutable ni throttlé.
  if new.user_id = '00000000-0000-0000-0000-00000000b07f' then
    return new;
  end if;

  select true, until into v_is_muted, v_until
    from public.chat_mutes where user_id = new.user_id;
  if v_is_muted and (v_until is null or v_until > now()) then
    raise exception 'chat_muted'
      using hint = 'Un admin t''a rendu muet dans le Salon.';
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

-- 3. Annonce du résultat quand un match passe à 'finished'.
create or replace function public.announce_match_result()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_home text;
  v_away text;
begin
  if new.status = 'finished'
     and old.status is distinct from 'finished'
     and new.home_score is not null
     and new.away_score is not null then
    select name_fr into v_home from ref.teams where id = new.home_team_id;
    select name_fr into v_away from ref.teams where id = new.away_team_id;
    insert into public.comments (user_id, parent_type, parent_id, body)
    values (
      '00000000-0000-0000-0000-00000000b07f',
      'global',
      '00000000-0000-0000-0000-000000000000',
      left(
        '⚽ Terminé — ' || coalesce(v_home, '?') || ' ' ||
        new.home_score || '–' || new.away_score || ' ' || coalesce(v_away, '?'),
        280
      )
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists matches_announce_result on ref.matches;
create trigger matches_announce_result
  after update on ref.matches
  for each row execute function public.announce_match_result();

notify pgrst, 'reload schema';
