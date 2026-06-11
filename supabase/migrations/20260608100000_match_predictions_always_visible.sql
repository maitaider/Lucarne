-- Décision produit (humain, 2026-06-10) : retirer l'anti-triche sur l'affichage
-- des pronostics du groupe. `match_predictions` ne garde plus le coup d'envoi —
-- les pronos nominatifs de chacun sont visibles à tout moment, y compris avant
-- le coup d'envoi d'un match programmé.
--
-- ⚠️ Conséquence assumée : un joueur peut voir le pronostic d'un autre avant de
-- poser le sien (la protection anti-copie n'existe plus pour ce panneau). Pour
-- revenir en arrière, réappliquer le garde de 20260601180000
-- (`and (now() >= m.kickoff_at or m.status in ('live','finished'))`).
--
-- Le reste est inchangé : authenticated requis, score-only (`exact_score`),
-- agrégat ordonné par points puis username, SECURITY DEFINER (contourne la RLS
-- anti-copie sur bets.SELECT, qui reste en place mais n'est plus le chemin UI).
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
  where b.match_id = p_match_id
    and b.bet_type = 'exact_score'
    and b.status in ('validated', 'settled')
    and auth.uid() is not null
  order by b.points desc nulls last, p.username asc;
$function$;
revoke all on function public.match_predictions(uuid) from anon, public;
grant execute on function public.match_predictions(uuid) to authenticated;
