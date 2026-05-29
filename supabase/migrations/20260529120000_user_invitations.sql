-- =============================================================================
-- User-level invitations
-- -----------------------------------------------------------------------------
-- Let ANY authenticated user invite friends to create an account and play.
-- These invites are account-level (league_id = NULL): the invitee signs up and
-- joins the global pool / leaderboard. League-scoped invites stay owner/admin
-- only via generate_invitation(). redeem_invitation() already handles a NULL
-- league_id (it simply doesn't add the user to any league), so no change is
-- needed on the redemption side.
-- =============================================================================

create or replace function public.generate_user_invitation(
  p_expires_days integer default 14,
  p_max_uses integer default 1
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
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_expires_days < 1 or p_expires_days > 30 then
    raise exception 'invalid_expiration';
  end if;
  if p_max_uses < 1 or p_max_uses > 50 then
    raise exception 'invalid_max_uses';
  end if;

  -- Generate a unique code (retry on collision), account-level (league_id NULL).
  loop
    v_code := private.gen_invitation_code();
    begin
      insert into public.invitations (code, league_id, created_by, expires_at, max_uses)
      values (v_code, null, v_user_id, v_expires, p_max_uses);
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
