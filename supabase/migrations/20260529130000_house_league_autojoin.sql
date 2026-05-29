-- =============================================================================
-- House league + auto-join + unlimited invite codes
-- -----------------------------------------------------------------------------
-- Product change: there is one "house" league (the admin's main pool) that
-- EVERY new player joins on sign-up. Invite codes can be unlimited-use (a
-- permanent link). New-player tracking is read from public.profiles.
-- =============================================================================

-- 1. Mark one league as the default "house" league ---------------------------
alter table public.leagues
  add column if not exists is_default boolean not null default false;

-- Only ever one default league.
create unique index if not exists leagues_single_default
  on public.leagues (is_default) where is_default;

-- The first league created becomes the house league automatically.
create or replace function public.tg_ensure_default_league()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.leagues where is_default and deleted_at is null
  ) then
    new.is_default := true;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_default_league on public.leagues;
create trigger ensure_default_league
  before insert on public.leagues
  for each row execute function public.tg_ensure_default_league();

-- Backfill: if leagues already exist but none is default, promote the oldest.
update public.leagues
   set is_default = true
 where id = (
   select id from public.leagues
    where deleted_at is null
    order by created_at asc
    limit 1
 )
 and not exists (select 1 from public.leagues where is_default and deleted_at is null);

-- 2. Allow unlimited-use codes (max_uses NULL = unlimited) --------------------
alter table public.invitations alter column max_uses drop not null;
alter table public.invitations drop constraint if exists invitations_max_uses_check;
alter table public.invitations
  add constraint invitations_max_uses_check check (max_uses is null or max_uses >= 1);

-- 3. redeem_invitation: support unlimited + always join the house league ------
create or replace function public.redeem_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_default uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invitation from public.invitations
   where code = p_code
     and revoked_at is null
     and (max_uses is null or uses < max_uses)
     and expires_at > now()
   for update;

  if v_invitation.id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  update public.invitations set uses = uses + 1 where id = v_invitation.id;

  -- The code's specific league, if any.
  if v_invitation.league_id is not null then
    insert into public.league_members (league_id, user_id, role)
    values (v_invitation.league_id, v_user_id, 'member')
    on conflict do nothing;
  end if;

  -- Every new player also joins the house (default) league.
  select id into v_default from public.leagues where is_default and deleted_at is null limit 1;
  if v_default is not null then
    insert into public.league_members (league_id, user_id, role)
    values (v_default, v_user_id, 'member')
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'invitation_id', v_invitation.id,
    'league_id', coalesce(v_invitation.league_id, v_default)
  );
end;
$$;

-- 4. generate_user_invitation: unlimited by default + stamp the house league --
create or replace function public.generate_user_invitation(
  p_expires_days integer default 30,
  p_max_uses integer default null
)
returns table(code text, expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_expires timestamptz := now() + (p_expires_days || ' days')::interval;
  v_league uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_expires_days < 1 or p_expires_days > 90 then
    raise exception 'invalid_expiration';
  end if;
  if p_max_uses is not null and p_max_uses < 1 then
    raise exception 'invalid_max_uses';
  end if;

  select id into v_league from public.leagues where is_default and deleted_at is null limit 1;

  loop
    v_code := private.gen_invitation_code();
    begin
      insert into public.invitations (code, league_id, created_by, expires_at, max_uses)
      values (v_code, v_league, v_user_id, v_expires, p_max_uses);
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 10 then
        raise exception 'code_generation_failed';
      end if;
    end;
  end loop;

  return query select v_code, v_expires;
end;
$$;

revoke all on function public.generate_user_invitation(integer, integer) from public;
grant execute on function public.generate_user_invitation(integer, integer) to authenticated;
