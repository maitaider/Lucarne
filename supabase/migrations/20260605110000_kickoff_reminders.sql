-- Rappels avant le coup d'envoi : notifie les joueurs ayant l'accès (paiement
-- confirmé) qui n'ont PAS encore pronostiqué un match dont le coup d'envoi
-- approche. Type 'match_kickoff' (déjà dans l'enum + déjà câblé dans le toggle
-- de réglages « Matchs (rappels, buts) ») — aucun joueur n'en recevait jusqu'ici.
--
-- Appelé par la route cron /api/cron/kickoff-reminders (client service-role).
-- Idempotent : UN rappel par (joueur, match) au maximum — un même match déjà
-- notifié n'est jamais re-notifié, même si le cron tourne souvent. Respecte les
-- notifications coupées (notification_prefs.muted_types).
--
-- Fenêtre paramétrable (p_within_minutes) pour s'adapter à la cadence du cron :
--   • cron quotidien  → fenêtre large (1440 = 24 h, « digest du jour »)
--   • cron horaire (Vercel Pro) → fenêtre courte (~180 = « commence dans 3 h »)
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
