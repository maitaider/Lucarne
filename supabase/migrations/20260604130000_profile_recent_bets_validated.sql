-- profile_recent_bets : afficher aussi les pronos VALIDÉS (pas seulement « settled »).
--
-- Bug : sur le profil joueur `/u/[username]`, la stat « PRONOSTICS » compte TOUS les
-- paris (`mv_global_standings.bets_count = count(*)`), mais la liste d'activité ne
-- renvoyait que `status = 'settled'`. Un prono VALIDÉ (match pas encore joué, sans
-- résultat) comptait donc dans la stat mais ne s'affichait jamais — y compris sur
-- son PROPRE profil (« PRONOSTICS 1 » mais « Aucun pronostic réglé »).
--
-- Correctif : renvoyer `validated` + `settled`, en PRÉSERVANT l'anti-copie —
--   * le joueur voit TOUS ses propres pronos (auth.uid() = la cible) ;
--   * un tiers ne voit un prono `validated` qu'une fois le match commencé
--     (`now() >= kickoff_at` ou statut `live`/`finished`), ou s'il est `settled`.
--   (Même garde que `match_predictions` — un pick d'avant-match d'autrui reste caché.)
--
-- Signature de retour INCHANGÉE → aucune régénération de types nécessaire.

create or replace function public.profile_recent_bets(
  p_username text,
  p_limit int default 8
)
returns table (
  bet_id uuid,
  match_id uuid,
  kickoff_at timestamptz,
  match_status text,
  bet_type text,
  result text,
  points int,
  payload jsonb,
  home_name_fr text,
  home_name_en text,
  home_iso text,
  home_fifa text,
  home_score int,
  away_name_fr text,
  away_name_en text,
  away_iso text,
  away_fifa text,
  away_score int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := public.resolve_viewable_profile(p_username);
begin
  if v_target is null then
    return;
  end if;

  return query
  select
    b.id,
    b.match_id,
    m.kickoff_at,
    m.status::text,
    b.bet_type::text,
    b.result::text,
    b.points::int,
    b.payload,
    ht.name_fr, ht.name_en, ht.iso_code, ht.fifa_code, m.home_score::int,
    awt.name_fr, awt.name_en, awt.iso_code, awt.fifa_code, m.away_score::int
  from public.bets b
  left join ref.matches m on m.id = b.match_id
  left join ref.teams ht on ht.id = m.home_team_id
  left join ref.teams awt on awt.id = m.away_team_id
  where b.user_id = v_target
    and b.status in ('validated', 'settled')
    and (
      auth.uid() = v_target                       -- son propre profil : tous ses pronos
      or b.status = 'settled'                      -- réglé : match terminé, rien à copier
      or (                                         -- match commencé : garde anti-copie levée
        m.id is not null
        and (now() >= m.kickoff_at or m.status in ('live', 'finished'))
      )
    )
  order by coalesce(m.kickoff_at, b.submitted_at) desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.profile_recent_bets(text, int) from public;
grant execute on function public.profile_recent_bets(text, int) to authenticated;

notify pgrst, 'reload schema';
