-- Salon — itération 5d : bot « carton plein » + slow mode admin.

-- 1. Réglage slow mode (intervalle mini configurable entre 2 messages) ---------
alter table public.app_settings
  add column if not exists chat_slow_mode_seconds int not null default 0;

-- 2. throttle_global_chat : honore le slow mode (max du 3 s anti-spam et du
--    réglage admin). Bot toujours exempté.
create or replace function public.throttle_global_chat()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_until timestamptz;
  v_is_muted boolean := false;
  v_min int;
begin
  if new.parent_type <> 'global' then
    return new;
  end if;
  if new.user_id = '00000000-0000-0000-0000-00000000b07f' then
    return new;
  end if;

  select true, until into v_is_muted, v_until
    from public.chat_mutes where user_id = new.user_id;
  if v_is_muted and (v_until is null or v_until > now()) then
    raise exception 'chat_muted'
      using hint = 'Un admin t''a rendu muet dans le Salon.';
  end if;

  v_min := greatest(
    3,
    coalesce((select chat_slow_mode_seconds from public.app_settings order by id limit 1), 0)
  );
  if exists (
    select 1 from public.comments
     where user_id = new.user_id
       and parent_type = 'global'
       and deleted_at is null
       and created_at > now() - make_interval(secs => v_min)
  ) then
    raise exception 'chat_rate_limited'
      using hint = 'Mode lent actif — patiente un peu avant de renvoyer un message.';
  end if;

  return new;
end;
$function$;

-- 3. announce_match_result : féliciter les « carton plein » (score exact deviné).
--    Les @mentions déclenchent notify_comment → les gagnants reçoivent une notif.
create or replace function public.announce_match_result()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_home text;
  v_away text;
  v_winners text;
  v_msg text;
begin
  if new.status = 'finished'
     and old.status is distinct from 'finished'
     and new.home_score is not null
     and new.away_score is not null then
    select name_fr into v_home from ref.teams where id = new.home_team_id;
    select name_fr into v_away from ref.teams where id = new.away_team_id;

    select string_agg('@' || u, ' ') into v_winners
    from (
      select p.username::text as u
      from public.bets b
      join public.profiles p on p.id = b.user_id
      where b.match_id = new.id
        and b.bet_type = 'exact_score'
        and b.status in ('validated', 'settled')
        and jsonb_typeof(b.payload -> 'home') = 'number'
        and jsonb_typeof(b.payload -> 'away') = 'number'
        and (b.payload ->> 'home')::int = new.home_score
        and (b.payload ->> 'away')::int = new.away_score
      order by p.username
      limit 6
    ) s;

    v_msg := '⚽ Terminé — ' || coalesce(v_home, '?') || ' ' ||
             new.home_score || '–' || new.away_score || ' ' || coalesce(v_away, '?');
    if v_winners is not null then
      v_msg := v_msg || ' · 🎯 ' || v_winners || ' carton plein !';
    end if;

    insert into public.comments (user_id, parent_type, parent_id, body)
    values (
      '00000000-0000-0000-0000-00000000b07f', 'global',
      '00000000-0000-0000-0000-000000000000', left(v_msg, 280)
    );
  end if;
  return new;
end;
$function$;

-- 4. RPC admin : régler le slow mode -----------------------------------------
create or replace function public.admin_set_chat_slowmode(p_seconds int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if p_seconds < 0 or p_seconds > 3600 then
    raise exception 'bad_value';
  end if;
  update public.app_settings
     set chat_slow_mode_seconds = p_seconds, updated_at = now(), updated_by = auth.uid();
  insert into private.audit_log (actor_id, action, target_table, target_id, payload)
  values (auth.uid(), 'admin_set_chat_slowmode', 'app_settings', null,
          jsonb_build_object('seconds', p_seconds));
end;
$function$;
revoke all on function public.admin_set_chat_slowmode(int) from public;
grant execute on function public.admin_set_chat_slowmode(int) to authenticated;

notify pgrst, 'reload schema';
