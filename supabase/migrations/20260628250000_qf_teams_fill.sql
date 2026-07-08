-- Remplit les équipes des quarts de finale (QF) par propagation des vainqueurs
-- de 8e. Vérifié multi-sources : QF = France-Maroc, Espagne-Belgique,
-- Norvège-Angleterre, Argentine-Suisse (dates/stades de l'app déjà corrects).
--
-- 🛑 RÈGLE D'OR (cf. mémoire lucarne-knockout-bracket-fill) : on ne touche QUE
-- home_team_id/away_team_id — JAMAIS les placeholders W<n> (ils pilotent
-- l'affichage des pronos ; les réécrire casserait les brackets des joueurs).
--
-- Propagation PER-SIDE (chaque côté indépendamment) : ainsi M100 affiche
-- « Argentine vs <en attente> » tant que le 8e M96 (Suisse-Colombie) n'est pas
-- saisi (winner_team_id NULL → côté away non rempli). Dès que l'admin saisit
-- Suisse-Colombie, re-jouer cette propagation complètera M100.

update ref.matches r
set home_team_id = hm.winner_team_id
from ref.matches hm
where r.stage = 'qf'
  and r.home_placeholder ~ '^W[0-9]+$'
  and hm.match_number = substring(r.home_placeholder from 2)::int
  and hm.winner_team_id is not null;

update ref.matches r
set away_team_id = am.winner_team_id
from ref.matches am
where r.stage = 'qf'
  and r.away_placeholder ~ '^W[0-9]+$'
  and am.match_number = substring(r.away_placeholder from 2)::int
  and am.winner_team_id is not null;
