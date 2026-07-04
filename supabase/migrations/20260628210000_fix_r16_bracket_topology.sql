-- CORRECTION de la topologie des 8es de finale (R16). Les placeholders W<n> des
-- 8es de l'app (M89-M96) ne correspondaient PAS au vrai bracket FIFA 2026 : ils
-- appariaient les mauvais vainqueurs de 16e (ex. app M92 = W79 vs W81 = France
-- vs Angleterre, alors que France doit affronter le vainqueur du créneau
-- Allemagne/Paraguay = Paraguay). Le remplissage précédent (20260628200000)
-- propageait donc des affiches fausses.
--
-- Le QF/SF/3e/finale de l'app (M97-M104) sont DÉJÀ corrects (topologie identique
-- à la FIFA : QF97=W89vsW90, etc.), donc seuls les 8 placeholders des 8es sont
-- à corriger. On mappe les numéros de 16e (R32) de l'app (brouillés vs FIFA) via
-- leurs paires de groupes, puis on réécrit les W<n> des 8es selon la topologie
-- officielle (off89=W74vsW77 → en numéros app = W75 vs W79, etc.), et on
-- re-propage les équipes.
--
-- Vérifié : donne PAR-FRA, MEX-BEL, MAR-NOR, BRA-USA, CAN-COL, ENG-SUI, POR-ARG,
-- ESP-EGY (16 équipes distinctes). N.B. dates/stades par n° de match NON touchés
-- (à auditer séparément contre le calendrier officiel).

update ref.matches set home_placeholder='W75', away_placeholder='W79' where match_number=89 and stage='r16'; -- PAR vs FRA
update ref.matches set home_placeholder='W77', away_placeholder='W82' where match_number=90 and stage='r16'; -- MEX vs BEL
update ref.matches set home_placeholder='W76', away_placeholder='W78' where match_number=91 and stage='r16'; -- MAR vs NOR
update ref.matches set home_placeholder='W74', away_placeholder='W80' where match_number=92 and stage='r16'; -- BRA vs USA
update ref.matches set home_placeholder='W73', away_placeholder='W88' where match_number=93 and stage='r16'; -- CAN vs COL
update ref.matches set home_placeholder='W81', away_placeholder='W85' where match_number=94 and stage='r16'; -- ENG vs SUI
update ref.matches set home_placeholder='W84', away_placeholder='W87' where match_number=95 and stage='r16'; -- POR vs ARG
update ref.matches set home_placeholder='W83', away_placeholder='W86' where match_number=96 and stage='r16'; -- ESP vs EGY

-- Re-propage les équipes depuis les placeholders corrigés (résolution générique
-- W<n> -> vainqueur du match n).
update ref.matches r
set home_team_id = hm.winner_team_id,
    away_team_id = am.winner_team_id
from ref.matches hm, ref.matches am
where r.stage = 'r16'
  and r.home_placeholder ~ '^W[0-9]+$'
  and r.away_placeholder ~ '^W[0-9]+$'
  and hm.match_number = substring(r.home_placeholder from 2)::int
  and am.match_number = substring(r.away_placeholder from 2)::int
  and hm.winner_team_id is not null
  and am.winner_team_id is not null;
