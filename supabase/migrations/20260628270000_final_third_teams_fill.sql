-- Remplit les équipes de la FINALE (W101 vs W102) et du match pour la 3e PLACE
-- (L101 vs L102 = PERDANTS des demies) une fois les 2 demies jouées.
-- Résultat attendu : Finale Espagne (W101) vs Argentine (W102) ;
-- 3e place France (L101, perdant SF1) vs Angleterre (L102, perdant SF2).
--
-- 🛑 RÈGLE D'OR : équipes seulement (home_team_id/away_team_id), placeholders
-- W<n>/L<n> JAMAIS touchés. La 3e place utilise L<n> (PERDANT) = l'équipe du
-- match n qui n'est pas winner_team_id (la propagation générique W<n> ne le gère
-- pas). Per-side, gardé sur match n terminé + winner + 2 équipes connues.

-- FINALE — côtés W<n>
update ref.matches r set home_team_id = hm.winner_team_id
from ref.matches hm
where r.stage='final' and r.home_placeholder ~ '^W[0-9]+$'
  and hm.match_number=substring(r.home_placeholder from 2)::int and hm.winner_team_id is not null;
update ref.matches r set away_team_id = am.winner_team_id
from ref.matches am
where r.stage='final' and r.away_placeholder ~ '^W[0-9]+$'
  and am.match_number=substring(r.away_placeholder from 2)::int and am.winner_team_id is not null;

-- 3e PLACE — côtés L<n> (perdant)
update ref.matches r
set home_team_id = case when hm.home_team_id=hm.winner_team_id then hm.away_team_id else hm.home_team_id end
from ref.matches hm
where r.stage='third_place' and r.home_placeholder ~ '^L[0-9]+$'
  and hm.match_number=substring(r.home_placeholder from 2)::int
  and hm.status='finished' and hm.winner_team_id is not null
  and hm.home_team_id is not null and hm.away_team_id is not null;
update ref.matches r
set away_team_id = case when am.home_team_id=am.winner_team_id then am.away_team_id else am.home_team_id end
from ref.matches am
where r.stage='third_place' and r.away_placeholder ~ '^L[0-9]+$'
  and am.match_number=substring(r.away_placeholder from 2)::int
  and am.status='finished' and am.winner_team_id is not null
  and am.home_team_id is not null and am.away_team_id is not null;
