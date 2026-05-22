-- =============================================================================
-- Lucarne — Admin validation RPCs + scoring + settlement
-- =============================================================================

-- 1. admin_mark_payment_received
--    Step 1 of the two-step validation: admin acknowledges receipt of cash.
create or replace function public.admin_mark_payment_received(
  p_bet_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_payment_reference text default null,
  p_expected_status validation_status default 'awaiting_payment'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role app_role;
  v_validation private.bet_validations%rowtype;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role not in ('admin', 'super_admin') then
    raise exception 'forbidden';
  end if;

  -- Lock the validation row (or create if missing)
  insert into private.bet_validations (bet_id, submitted_amount_cents, payment_method, payment_reference, status)
  values (p_bet_id, p_amount_cents, p_payment_method, p_payment_reference, 'payment_received')
  on conflict (bet_id) do update
    set submitted_amount_cents = excluded.submitted_amount_cents,
        payment_method = excluded.payment_method,
        payment_reference = excluded.payment_reference,
        status = 'payment_received',
        updated_at = now()
    where private.bet_validations.status = p_expected_status;

  -- Sync bet status
  update public.bets set status = 'paid' where id = p_bet_id;

  insert into private.audit_log (actor_id, action, entity_type, entity_id, diff)
  values (v_user_id, 'mark_payment_received', 'bet', p_bet_id,
          jsonb_build_object('amount_cents', p_amount_cents, 'method', p_payment_method));
end;
$$;

revoke all on function public.admin_mark_payment_received from public;
grant execute on function public.admin_mark_payment_received to authenticated;

-- 2. admin_validate_bet
--    Step 2: actual validation. Bet becomes "validated" and is locked.
create or replace function public.admin_validate_bet(
  p_bet_id uuid,
  p_expected_status validation_status default 'payment_received'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role app_role;
  v_bet public.bets%rowtype;
  v_kickoff timestamptz;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role not in ('admin', 'super_admin') then raise exception 'forbidden'; end if;

  select * into v_bet from public.bets where id = p_bet_id;
  if v_bet.id is null then raise exception 'bet_not_found'; end if;

  -- Window check: must validate before kickoff - 60s
  if v_bet.match_id is not null then
    select kickoff_at into v_kickoff from ref.matches where id = v_bet.match_id;
    if now() > v_kickoff - interval '60 seconds' then
      -- Auto-reject: too late
      update public.bets set status = 'rejected' where id = p_bet_id;
      update private.bet_validations
        set status = 'rejected', rejection_reason = 'auto: kickoff too close',
            validated_by = v_user_id, validated_at = now()
       where bet_id = p_bet_id;
      raise exception 'kickoff_too_close';
    end if;
  end if;

  -- CAS update on validation
  update private.bet_validations
     set status = 'validated', validated_by = v_user_id, validated_at = now()
   where bet_id = p_bet_id and status = p_expected_status;

  if not found then raise exception 'validation_state_mismatch'; end if;

  -- Bet becomes validated. Stake is debited from balance (no refund pre-settle).
  update public.bets set status = 'validated' where id = p_bet_id;

  -- Debit balance via append-only transactions
  insert into public.transactions (user_id, direction, amount_cents, reason, bet_id, balance_after_cents)
  select v_bet.user_id, 'debit', v_bet.stake_cents, 'bet_stake', v_bet.id,
         coalesce((select balance_cents from public.profiles where id = v_bet.user_id), 0) - v_bet.stake_cents;

  update public.profiles
     set balance_cents = balance_cents - v_bet.stake_cents
   where id = v_bet.user_id;

  -- Notification to user
  insert into public.notifications (user_id, type, payload)
  values (v_bet.user_id, 'bet_validated', jsonb_build_object('bet_id', v_bet.id));

  insert into private.audit_log (actor_id, action, entity_type, entity_id)
  values (v_user_id, 'validate_bet', 'bet', p_bet_id);
end;
$$;

revoke all on function public.admin_validate_bet from public;
grant execute on function public.admin_validate_bet to authenticated;

-- 3. admin_reject_bet
create or replace function public.admin_reject_bet(
  p_bet_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role app_role;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  select role into v_role from public.profiles where id = v_user_id;
  if v_role not in ('admin', 'super_admin') then raise exception 'forbidden'; end if;

  if char_length(p_reason) < 10 then raise exception 'reason_too_short'; end if;

  update private.bet_validations
     set status = 'rejected', rejection_reason = p_reason,
         validated_by = v_user_id, validated_at = now()
   where bet_id = p_bet_id;

  update public.bets set status = 'rejected' where id = p_bet_id;

  insert into public.notifications (user_id, type, payload)
  select user_id, 'bet_rejected', jsonb_build_object('bet_id', id, 'reason', p_reason)
    from public.bets where id = p_bet_id;

  insert into private.audit_log (actor_id, action, entity_type, entity_id, diff)
  values (v_user_id, 'reject_bet', 'bet', p_bet_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.admin_reject_bet from public;
grant execute on function public.admin_reject_bet to authenticated;

-- =============================================================================
-- Scoring engine: compute_bet_points
-- =============================================================================
create or replace function public.compute_bet_points(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet public.bets%rowtype;
  v_match ref.matches%rowtype;
  v_rules jsonb;
  v_points int := 0;
  v_payout bigint := 0;
  v_result bet_result := 'lost';
  v_pred_winner text;
  v_pred_home int;
  v_pred_away int;
  v_actual_winner text;
begin
  select * into v_bet from public.bets where id = p_bet_id;
  if v_bet.id is null or v_bet.status <> 'validated' then return; end if;

  if v_bet.match_id is not null then
    select * into v_match from ref.matches where id = v_bet.match_id;
    if v_match.status <> 'finished' then return; end if;
  end if;

  select rules into v_rules from public.scoring_profiles where is_default = true limit 1;

  -- match_winner (1N2)
  if v_bet.bet_type = 'match_winner' and v_match.id is not null then
    v_pred_winner := v_bet.payload->>'winner';
    if v_match.home_score > v_match.away_score then v_actual_winner := 'home';
    elsif v_match.home_score < v_match.away_score then v_actual_winner := 'away';
    else v_actual_winner := 'draw';
    end if;
    if v_pred_winner = v_actual_winner then
      v_points := (v_rules->>'match_winner')::int;
      v_result := 'won';
    end if;
  end if;

  -- exact_score
  if v_bet.bet_type = 'exact_score' and v_match.id is not null then
    v_pred_home := (v_bet.payload->>'home')::int;
    v_pred_away := (v_bet.payload->>'away')::int;
    if v_pred_home = v_match.home_score and v_pred_away = v_match.away_score then
      v_points := (v_rules->>'exact_score')::int;
      v_result := 'won';
    elsif (v_pred_home - v_pred_away) = (v_match.home_score - v_match.away_score) then
      v_points := (v_rules->>'goal_diff_correct')::int;
      v_result := 'won';
    elsif sign(v_pred_home - v_pred_away) = sign(v_match.home_score - v_match.away_score) then
      -- tendency only (vainqueur OK)
      v_points := (v_rules->>'match_winner')::int;
      v_result := 'won';
    end if;
  end if;

  -- Payout = stake × (1 + points/10) heuristique; you can refine.
  -- Simpler: payout = stake * multiplier if won, else 0
  if v_result = 'won' then
    v_payout := v_bet.stake_cents * (v_points / 2)::numeric;
    if v_payout < v_bet.stake_cents then v_payout := v_bet.stake_cents * 2;
    end if;
  end if;

  update public.bets
     set status = 'settled', result = v_result, points = v_points, payout_cents = v_payout
   where id = p_bet_id;

  if v_payout > 0 then
    insert into public.transactions (user_id, direction, amount_cents, reason, bet_id, balance_after_cents)
    select v_bet.user_id, 'credit', v_payout, 'bet_payout', v_bet.id,
           coalesce((select balance_cents from public.profiles where id = v_bet.user_id), 0) + v_payout;
    update public.profiles set balance_cents = balance_cents + v_payout where id = v_bet.user_id;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (v_bet.user_id, 'bet_settled',
          jsonb_build_object('bet_id', v_bet.id, 'result', v_result, 'points', v_points, 'payout', v_payout));
end;
$$;

-- Settle all validated bets for a match when it finishes
create or replace function public.settle_match_bets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bet_id uuid;
begin
  if (new.status = 'finished' and (old.status is distinct from 'finished')) then
    for v_bet_id in
      select id from public.bets
       where match_id = new.id and status = 'validated'
    loop
      perform public.compute_bet_points(v_bet_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_settle_on_finish on ref.matches;
create trigger matches_settle_on_finish
  after update on ref.matches
  for each row
  when (new.status = 'finished')
  execute function public.settle_match_bets();

-- =============================================================================
-- Helper view: admin queue
-- =============================================================================
create or replace view public.admin_bet_validation_queue as
select
  b.id as bet_id,
  b.user_id,
  p.username,
  p.display_name,
  b.bet_type,
  b.payload,
  b.stake_cents,
  b.status as bet_status,
  bv.status as validation_status,
  bv.submitted_amount_cents,
  bv.payment_method,
  bv.payment_reference,
  bv.created_at as request_at,
  m.id as match_id,
  m.kickoff_at,
  m.stage
from public.bets b
join public.profiles p on p.id = b.user_id
left join private.bet_validations bv on bv.bet_id = b.id
left join ref.matches m on m.id = b.match_id
where b.status in ('pending_payment', 'paid')
order by m.kickoff_at asc nulls last, b.submitted_at asc;

grant select on public.admin_bet_validation_queue to authenticated;

-- RLS on view (admin only)
alter view public.admin_bet_validation_queue set (security_invoker = on);
