-- Restaure les placeholders W<n> des 8es à leur valeur ORIGINALE (celle contre
-- laquelle les joueurs ont bâti leur prono). Les migrations #153/#154 avaient
-- réécrit ces placeholders pour corriger le CALENDRIER — mais ces mêmes
-- placeholders pilotent aussi l'AFFICHAGE du bracket de prono (predict-board
-- résout knockout_winners contre les placeholders DB en direct). Résultat : les
-- choix de 8e des joueurs (figés contre l'ancienne topologie) devenaient
-- orphelins → arbre incohérent (vérifié : 7/8 orphelins pour mehdi).
--
-- Découplage : le CALENDRIER réel s'affiche via home_team_id/away_team_id (vraies
-- équipes, DÉJÀ correctes, ON NE Y TOUCHE PAS) ; le PRONO s'affiche via les
-- placeholders → on les remet à l'original. La propagation des tours suivants
-- (QF) utilise les NUMÉROS de match (W89 = vainqueur du match 89), pas ces
-- placeholders → non impactée.
--
-- ⚠️ NE PAS re-propager après ça (ça réécrirait les vraies équipes depuis les
-- placeholders originaux = fausses affiches). On ne touche QUE les placeholders.

update ref.matches set home_placeholder='W73', away_placeholder='W76' where match_number=89 and stage='r16';
update ref.matches set home_placeholder='W74', away_placeholder='W78' where match_number=90 and stage='r16';
update ref.matches set home_placeholder='W75', away_placeholder='W77' where match_number=91 and stage='r16';
update ref.matches set home_placeholder='W79', away_placeholder='W81' where match_number=92 and stage='r16';
update ref.matches set home_placeholder='W80', away_placeholder='W82' where match_number=93 and stage='r16';
update ref.matches set home_placeholder='W83', away_placeholder='W84' where match_number=94 and stage='r16';
update ref.matches set home_placeholder='W85', away_placeholder='W88' where match_number=95 and stage='r16';
update ref.matches set home_placeholder='W86', away_placeholder='W87' where match_number=96 and stage='r16';
