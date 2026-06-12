-- Les rappels « Un match arrive — pronostique avant le coup d'envoi ! » ne
-- doivent PLUS partir une fois le verrou GLOBAL de pronostic franchi : en modèle
-- « gel au coup d'envoi du tournoi », personne ne peut plus pronostiquer, donc
-- ces rappels par-match sont trompeurs (l'utilisateur reçoit « pronostique »
-- alors que tout est verrouillé). On ajoute un simple garde-fou en tête :
-- `predictions_locked()` (= global_prediction_deadline() <= now()) → 0 rappel.
-- Avant l'échéance, comportement inchangé.
create or replace function public.cron_send_kickoff_reminders(
  p_within_minutes int default 1440
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $func$
declare
  v_count int;
begin
  -- Verrou global passé → plus de pronostic possible → aucun rappel par-match.
  if public.predictions_locked() then
    return 0;
  end if;

  with upcoming as (
    select
      m.id, m.kickoff_at,
      th.name_fr as home_fr, th.name_en as home_en,
      ta.name_fr as away_fr, ta.name_en as away_en
    from ref.matches m
    left join ref.teams th on th.id = m.home_team_id
    left join ref.teams ta on ta.id = m.away_team_id
    where m.status = 'scheduled'
      and m.kickoff_at > now()
      and m.kickoff_at <= now() + make_interval(mins => greatest(p_within_minutes, 1))
  ),
  -- Joueurs avec accès (un paiement confirmé), non archivés.
  eligible as (
    select pr.id as user_id
    from public.profiles pr
    where pr.deleted_at is null
      and exists (
        select 1 from public.real_payments rp
        where rp.user_id = pr.id and rp.status = 'confirmed'
      )
  ),
  to_send as (
    select
      e.user_id, u.id as match_id, u.kickoff_at,
      u.home_fr, u.home_en, u.away_fr, u.away_en
    from eligible e
    cross join upcoming u
    where
      -- pas encore de pronostic actif sur ce match
      not exists (
        select 1 from public.bets b
        where b.user_id = e.user_id
          and b.match_id = u.id
          and b.status in ('validated', 'settled')
      )
      -- pas déjà rappelé pour ce match
      and not exists (
        select 1 from public.notifications n
        where n.user_id = e.user_id
          and n.type = 'match_kickoff'
          and (n.payload->>'match_id') = u.id::text
      )
      -- n'a pas coupé les rappels de match
      and not exists (
        select 1 from public.notification_prefs np
        where np.user_id = e.user_id
          and 'match_kickoff' = any(np.muted_types)
      )
  )
  insert into public.notifications (user_id, type, payload)
  select
    user_id,
    'match_kickoff'::notif_type,
    jsonb_build_object(
      'match_id', match_id,
      'kickoff_at', kickoff_at,
      'home_fr', home_fr, 'home_en', home_en,
      'away_fr', away_fr, 'away_en', away_en
    )
  from to_send;

  get diagnostics v_count = row_count;
  return v_count;
end;
$func$;

revoke all on function public.cron_send_kickoff_reminders(int) from anon, public, authenticated;
grant execute on function public.cron_send_kickoff_reminders(int) to service_role;

notify pgrst, 'reload schema';
