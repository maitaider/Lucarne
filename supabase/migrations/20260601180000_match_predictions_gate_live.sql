-- Élargir le garde de match_predictions : un match qui a démarré (coup d'envoi
-- passé) OU qui est live/terminé révèle les pronos. Couvre le cas d'un match
-- marqué « Terminé » par l'admin avant son coup d'envoi officiel (tests, reports)
-- — un match fini doit logiquement montrer les pronostics. Anti-triche préservé :
-- un match 'scheduled' avant son kickoff reste caché.
create or replace function public.match_predictions(p_match_id uuid)
returns table(
  user_id uuid, username text, display_name text, avatar_url text, role text,
  pred_home int, pred_away int, status text, result text, points int
)
language sql stable security definer set search_path to 'public'
as $function$
  select
    b.user_id, p.username::text, p.display_name, p.avatar_url, p.role::text,
    (b.payload->>'home')::int, (b.payload->>'away')::int,
    b.status::text, b.result::text, b.points::int
  from public.bets b
  join public.profiles p on p.id = b.user_id and p.deleted_at is null
  join ref.matches m on m.id = b.match_id
  where b.match_id = p_match_id
    and b.bet_type = 'exact_score'
    and b.status in ('validated', 'settled')
    and auth.uid() is not null
    and (now() >= m.kickoff_at or m.status in ('live', 'finished'))
  order by b.points desc nulls last, p.username asc;
$function$;
revoke all on function public.match_predictions(uuid) from anon, public;
grant execute on function public.match_predictions(uuid) to authenticated;
