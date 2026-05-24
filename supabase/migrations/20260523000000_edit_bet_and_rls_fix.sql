-- =============================================================================
-- Edit-bet semantics + bet_validations RLS fix
-- =============================================================================
-- Changes:
--   1. Unique partial index on (user_id, match_id, bet_type) for active
--      bets, so each user can only have ONE active pick per type per match.
--   2. place_bet() upgraded to upsert: if a non-settled bet already exists
--      for (user, match, type), update its payload + submitted_at instead
--      of inserting a duplicate.
--   3. bet_validations got RLS enabled but no policy → permission denied
--      for admins reading it. Add an admin-only SELECT policy.
-- =============================================================================

-- 1. Unique partial index for active bets per (user, match, type)
--    "active" = status that could still affect scoring (validated, paid,
--    pending_payment). Settled/rejected/refunded bets are historical and
--    don't constrain future picks.
drop index if exists bets_one_active_per_match_type;
create unique index bets_one_active_per_match_type
  on public.bets (user_id, match_id, bet_type)
  where status in ('validated', 'paid', 'pending_payment')
    and match_id is not null;

-- 2. place_bet — upsert semantics
create or replace function public.place_bet(
  p_league_id uuid,
  p_match_id uuid,
  p_bet_type bet_type_enum,
  p_payload jsonb,
  p_stake_cents int default 0,
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match ref.matches%rowtype;
  v_id uuid;
  v_existing_active uuid;
  v_existing_idem uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  if p_stake_cents < 0 or p_stake_cents > 100000 then
    raise exception 'invalid_stake';
  end if;

  -- Idempotency by client_request_id (true replay safety)
  if p_client_request_id is not null then
    select id into v_existing_idem
      from public.bets
     where user_id = auth.uid()
       and client_request_id = p_client_request_id;
    if v_existing_idem is not null then
      return v_existing_idem;
    end if;
  end if;

  -- Match validation for match-bound bets
  if p_match_id is not null then
    select * into v_match from ref.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.kickoff_at - interval '1 hour' < now() then
      raise exception 'kickoff_too_close';
    end if;
  end if;

  -- League membership check
  if p_league_id is not null then
    if not public.is_league_member(p_league_id) then
      raise exception 'not_a_league_member';
    end if;
  end if;

  -- UPSERT: if user already has an active bet for this match+type, update it
  if p_match_id is not null then
    select id into v_existing_active
      from public.bets
     where user_id = auth.uid()
       and match_id = p_match_id
       and bet_type = p_bet_type
       and status in ('validated', 'paid', 'pending_payment');

    if v_existing_active is not null then
      update public.bets
         set payload = p_payload,
             stake_cents = p_stake_cents,
             submitted_at = now(),
             client_request_id = coalesce(p_client_request_id, client_request_id),
             updated_at = now()
       where id = v_existing_active;
      return v_existing_active;
    end if;
  end if;

  insert into public.bets (
    user_id, league_id, match_id, bet_type, payload, stake_cents,
    status, client_request_id, submitted_at
  )
  values (
    auth.uid(), p_league_id, p_match_id, p_bet_type, p_payload, p_stake_cents,
    'validated', p_client_request_id, now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.place_bet from public;
grant execute on function public.place_bet to authenticated;

-- 3. bet_validations admin policy
drop policy if exists "bet_validations_admin_read" on private.bet_validations;
create policy "bet_validations_admin_read"
  on private.bet_validations for select
  to authenticated
  using (public.is_admin());

drop policy if exists "bet_validations_admin_write" on private.bet_validations;
create policy "bet_validations_admin_write"
  on private.bet_validations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Make sure admins can also read the audit log
drop policy if exists "audit_log_admin_read" on private.audit_log;
create policy "audit_log_admin_read"
  on private.audit_log for select
  to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';
