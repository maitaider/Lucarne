-- Remplit les équipes des demi-finales (SF) par propagation des vainqueurs de
-- quart. Vérifié multi-sources (5 sources unanimes, confiance élevée) :
--   M101 France-Espagne (14 juil, AT&T Arlington/Dallas)
--   M102 Angleterre-Argentine (15 juil, Mercedes-Benz Atlanta)
-- Dates/stades de l'app déjà corrects (finale 19 juil MetLife, 3e 18 juil Miami).
--
-- 🛑 RÈGLE D'OR : on ne touche QUE home_team_id/away_team_id — JAMAIS les
-- placeholders W<n> (ils pilotent l'affichage des pronos). Propagation per-side.
-- 3e place (L101/L102) + finale (W101/W102) se rempliront quand les demies
-- seront jouées.

update ref.matches r
set home_team_id = hm.winner_team_id
from ref.matches hm
where r.stage = 'sf'
  and r.home_placeholder ~ '^W[0-9]+$'
  and hm.match_number = substring(r.home_placeholder from 2)::int
  and hm.winner_team_id is not null;

update ref.matches r
set away_team_id = am.winner_team_id
from ref.matches am
where r.stage = 'sf'
  and r.away_placeholder ~ '^W[0-9]+$'
  and am.match_number = substring(r.away_placeholder from 2)::int
  and am.winner_team_id is not null;
