-- Récap quotidien de la phase finale, visible par tous les joueurs : pour chaque
-- jour de match à élimination, les matchs + le classement des points gagnés CE
-- jour-là. En phase finale les points viennent surtout du BRACKET (avancées
-- d'équipes), pas de pronos de score par match (rares) → on attribue les points
-- bracket au JOUR où l'équipe se qualifie (gagne son match), exactement comme
-- recompute_bracket_points les calcule au total. On ajoute aussi les points de
-- pronos de score sur les matchs du jour.
--
-- SECURITY DEFINER (bets a une RLS anti-copie) : n'expose QUE des agrégats
-- (somme de points par joueur/jour) + champs profil publics. Aucun payload.

create or replace function public.knockout_daily_recap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rules jsonb;
  v_out jsonb;
begin
  select scoring_rules into v_rules from public.app_settings where id = 1;

  with km as (
    select m.id, m.match_number, m.stage, m.status, m.winner_team_id,
           m.home_team_id, m.away_team_id,
           (m.kickoff_at at time zone 'America/Toronto')::date as day,
           m.kickoff_at, m.home_score, m.away_score,
           ht.name_fr as h_fr, ht.name_en as h_en, ht.iso_code as h_iso, m.home_placeholder as h_ph,
           at.name_fr as a_fr, at.name_en as a_en, at.iso_code as a_iso, m.away_placeholder as a_ph
    from ref.matches m
    left join ref.teams ht on ht.id = m.home_team_id
    left join ref.teams at on at.id = m.away_team_id
    where m.stage <> 'group'
  ),
  matches_by_day as (
    select day, jsonb_agg(jsonb_build_object(
      'match_number', match_number, 'stage', stage::text, 'status', status::text,
      'home_score', home_score, 'away_score', away_score,
      'home', jsonb_build_object('name_fr', h_fr, 'name_en', h_en, 'iso', h_iso, 'ph', h_ph),
      'away', jsonb_build_object('name_fr', a_fr, 'name_en', a_en, 'iso', a_iso, 'ph', a_ph)
    ) order by kickoff_at) as matches
    from km group by day
  ),
  -- (1) Points de pronos de SCORE sur les matchs finis du jour.
  permatch as (
    select km.day, b.user_id, sum(b.points)::int as pts
    from km
    join public.bets b on b.match_id = km.id
    where km.status = 'finished' and b.status = 'settled' and b.points > 0
    group by km.day, b.user_id
  ),
  -- (2) Avancées bracket : chaque match fini → l'équipe gagnante atteint le tour
  -- suivant ; points pour ce tour, attribués au jour du match.
  adv as (
    select km.day, km.stage, km.winner_team_id as team,
      case km.stage
        when 'r32' then coalesce((v_rules->>'bracket_r16')::int, 1)
        when 'r16' then coalesce((v_rules->>'bracket_qf')::int, 3)
        when 'qf'  then coalesce((v_rules->>'bracket_sf')::int, 6)
        when 'sf'  then coalesce((v_rules->>'bracket_final')::int, 10)
        when 'third_place' then coalesce((v_rules->>'bracket_third')::int, 15)
        else 0 end as pts
    from km
    where km.status = 'finished' and km.winner_team_id is not null
      and km.stage in ('r32','r16','qf','sf','third_place')
  ),
  adv_pts as (
    select adv.day, tp.user_id, sum(adv.pts)::int as pts
    from adv
    join public.tournament_predictions tp on exists (
      select 1 from jsonb_each_text(tp.knockout_winners) kw
      join ref.matches pm on pm.match_number = kw.key::int
      where kw.value <> '' and kw.value::uuid = adv.team and pm.stage = adv.stage
    )
    group by adv.day, tp.user_id
  ),
  -- (3) Finale : champion (vainqueur) + finaliste (perdant), au jour de la finale.
  fin as (
    select km.day, km.winner_team_id as champ,
      case when km.home_team_id = km.winner_team_id then km.away_team_id else km.home_team_id end as runner
    from km
    where km.stage = 'final' and km.status = 'finished' and km.winner_team_id is not null
  ),
  champ_pts as (
    select fin.day, tp.user_id,
      ((case when tp.champion_team_id = fin.champ
             then coalesce((v_rules->>'bracket_champion')::int, 30) else 0 end)
      + (case when exists (
             select 1 from jsonb_each_text(tp.knockout_winners) kw
             join ref.matches pm on pm.match_number = kw.key::int
             where pm.stage = 'sf' and kw.value <> '' and kw.value::uuid = fin.runner
               and kw.value::uuid is distinct from tp.champion_team_id)
          then coalesce((v_rules->>'bracket_runner_up')::int, 20) else 0 end))::int as pts
    from fin cross join public.tournament_predictions tp
  ),
  all_pts as (
    select day, user_id, sum(pts)::int as pts
    from (
      select day, user_id, pts from permatch
      union all select day, user_id, pts from adv_pts
      union all select day, user_id, pts from champ_pts
    ) u
    group by day, user_id
  ),
  leaders_by_day as (
    select ap.day, jsonb_agg(jsonb_build_object(
      'username', pr.username, 'display_name', pr.display_name,
      'avatar_url', pr.avatar_url, 'points', ap.pts
    ) order by ap.pts desc, pr.username) as leaders
    from all_pts ap
    join public.profiles pr on pr.id = ap.user_id
    where ap.pts > 0 and pr.deleted_at is null
    group by ap.day
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'day', d.day,
    'matches', d.matches,
    'leaders', coalesce(l.leaders, '[]'::jsonb)
  ) order by d.day desc), '[]'::jsonb)
  into v_out
  from matches_by_day d
  left join leaders_by_day l on l.day = d.day;

  return v_out;
end;
$$;

revoke all on function public.knockout_daily_recap() from public, anon;
grant execute on function public.knockout_daily_recap() to authenticated;

notify pgrst, 'reload schema';
