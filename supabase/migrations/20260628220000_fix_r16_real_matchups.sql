-- CORRECTION DÉFINITIVE des affiches des 8es de finale (R16), d'après le VRAI
-- bracket du Mondial 2026 vérifié sur 6 sources en ligne (Wikipédia, Yahoo, Al
-- Jazeera, beIN, NBC…). La tentative précédente (20260628210000) reposait sur une
-- extraction de topologie Wikipédia ERRONÉE et a produit de fausses affiches.
--
-- Vraies affiches (home vs away) + regroupement QF (l'app apparie M89/M90→QF97,
-- M91/M92→QF98, M93/M94→QF99, M95/M96→QF100, topologie QF/SF/finale déjà bonne) :
--   M89 Canada–Maroc      \\_ QF97 = Maroc vs France
--   M90 Paraguay–France   /
--   M91 Espagne–Portugal  \\_ QF98
--   M92 USA–Belgique      /
--   M93 Brésil–Norvège    \\_ QF99
--   M94 Mexique–Angleterre/
--   M95 Argentine–Égypte  \\_ QF100
--   M96 Suisse–Colombie   /
--
-- On écrit les placeholders W<n> (n = match R32 app dont le vainqueur est
-- l'équipe voulue : CAN=W73, BRA=W74, PAR=W75, MAR=W76, MEX=W77, NOR=W78,
-- FRA=W79, USA=W80, ENG=W81, BEL=W82, ESP=W83, POR=W84, SUI=W85, EGY=W86,
-- ARG=W87, COL=W88) puis on re-propage. Dates/stades traités séparément.

update ref.matches set home_placeholder='W73', away_placeholder='W76' where match_number=89 and stage='r16'; -- CAN vs MAR
update ref.matches set home_placeholder='W75', away_placeholder='W79' where match_number=90 and stage='r16'; -- PAR vs FRA
update ref.matches set home_placeholder='W83', away_placeholder='W84' where match_number=91 and stage='r16'; -- ESP vs POR
update ref.matches set home_placeholder='W80', away_placeholder='W82' where match_number=92 and stage='r16'; -- USA vs BEL
update ref.matches set home_placeholder='W74', away_placeholder='W78' where match_number=93 and stage='r16'; -- BRA vs NOR
update ref.matches set home_placeholder='W77', away_placeholder='W81' where match_number=94 and stage='r16'; -- MEX vs ENG
update ref.matches set home_placeholder='W87', away_placeholder='W86' where match_number=95 and stage='r16'; -- ARG vs EGY
update ref.matches set home_placeholder='W85', away_placeholder='W88' where match_number=96 and stage='r16'; -- SUI vs COL

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
