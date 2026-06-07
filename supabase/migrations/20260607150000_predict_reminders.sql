-- Automated "finish your predictions" reminder before the global lock.
--
-- Complements the per-match kickoff reminders (cron_send_kickoff_reminders)
-- with a single, global nudge tied to the prediction deadline: paid players
-- who haven't completed BOTH their bracket and at least one match prediction
-- get one in-app notification when the deadline is within p_within_days.
--
-- Idempotent: one reminder per user, marked by a daily_challenge notification
-- whose payload.reason = 'predict_deadline'. Safe to run on any cadence.
--
-- Returns the user_ids newly notified so the cron route can email exactly those
-- (and only those — respecting muted prefs, which already filter the set).

create or replace function public.cron_send_predict_reminders(
  p_within_days int default 7
)
returns setof uuid
language plpgsql
security definer
set search_path to 'public'
as $func$
declare
  v_deadline timestamptz;
begin
  v_deadline := public.global_prediction_deadline();

  -- Only fire when a deadline is set, still in the future, and within the window.
  if v_deadline is null
     or v_deadline <= now()
     or v_deadline > now() + make_interval(days => greatest(p_within_days, 1)) then
    return;
  end if;

  return query
  with eligible as (
    select pr.id as user_id
    from public.profiles pr
    where pr.deleted_at is null
      -- has access (a confirmed payment)
      and exists (
        select 1 from public.real_payments rp
        where rp.user_id = pr.id and rp.status = 'confirmed'
      )
      -- predictions incomplete: bracket not finished (no tournament_predictions
      -- row, or no champion chosen yet) OR no match-score predictions at all
      and (
        not exists (
          select 1 from public.tournament_predictions tp
          where tp.user_id = pr.id and tp.champion_team_id is not null
        )
        or not exists (
          select 1 from public.bets b
          where b.user_id = pr.id and b.match_id is not null
        )
      )
      -- not already reminded
      and not exists (
        select 1 from public.notifications n
        where n.user_id = pr.id
          and n.type = 'daily_challenge'
          and n.payload->>'reason' = 'predict_deadline'
      )
      -- hasn't muted announcement-type notifications
      and not exists (
        select 1 from public.notification_prefs np
        where np.user_id = pr.id
          and 'daily_challenge' = any(np.muted_types)
      )
  ),
  ins as (
    insert into public.notifications (user_id, type, payload)
    select
      e.user_id,
      'daily_challenge'::notif_type,
      jsonb_build_object(
        'reason', 'predict_deadline',
        'title', 'Termine tes pronostics avant la date limite',
        'link', '/predict',
        'deadline', v_deadline
      )
    from eligible e
    returning user_id
  )
  select user_id from ins;
end;
$func$;

revoke all on function public.cron_send_predict_reminders(int) from anon, public, authenticated;
grant execute on function public.cron_send_predict_reminders(int) to service_role;

notify pgrst, 'reload schema';
