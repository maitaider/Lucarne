-- Corrige dates + stades des 8es de finale (R16) selon le vrai calendrier 2026
-- (vérifié multi-sources : Al Jazeera + recherche croisée). Les affiches ayant
-- été réassignées (#154), les dates/stades attachés aux n° de match ne
-- correspondaient plus (ex. Mexique-Angleterre affiché à Dallas le 6 juil. au
-- lieu de Mexico City / Estadio Azteca le 5 juil.). Kickoff stocké en UTC
-- (=GMT de la source), affiché en America/Toronto (ET = UTC-4).
--
--  M89 CAN-MAR  4 juil 13:00 ET  Houston (NRG)
--  M90 PAR-FRA  4 juil 17:00 ET  Philadelphia (Lincoln Financial)
--  M91 ESP-POR  6 juil 15:00 ET  Arlington (AT&T)
--  M92 USA-BEL  6 juil 20:00 ET  Seattle (Lumen)
--  M93 BRA-NOR  5 juil 16:00 ET  New York/New Jersey (MetLife)
--  M94 MEX-ENG  5 juil 20:00 ET  Mexico City (Estadio Azteca)
--  M95 ARG-EGY  7 juil 12:00 ET  Atlanta (Mercedes-Benz)
--  M96 SUI-COL  7 juil 16:00 ET  Vancouver (BC Place)
--
-- Matchs 'scheduled' → aucun trigger de résultat (announce/notify/settle gardent
-- status='finished') ; recompute_bracket idempotent, sans effet (8es non joués).

update ref.matches m
set kickoff_at = v.k, venue_id = v.vid
from (values
  (89, timestamptz '2026-07-04T17:00:00Z', uuid '7d1eca95-37a1-48ce-ac29-a046f90f5cd0'), -- Houston NRG
  (90, timestamptz '2026-07-04T21:00:00Z', uuid '4596964d-98c3-4380-a7af-5c0034ae394d'), -- Philadelphia
  (91, timestamptz '2026-07-06T19:00:00Z', uuid '96520cd0-4dd7-41a8-8a54-68965fff0a8b'), -- Arlington AT&T
  (92, timestamptz '2026-07-07T00:00:00Z', uuid '14880765-92bc-4da6-8e4a-f993f7f1b608'), -- Seattle Lumen
  (93, timestamptz '2026-07-05T20:00:00Z', uuid '9e2bf309-55bc-4a40-af52-416164af99f0'), -- NY/NJ MetLife
  (94, timestamptz '2026-07-06T00:00:00Z', uuid '25641d07-12f0-4eb0-b1d0-21323f7444b8'), -- Mexico City Azteca
  (95, timestamptz '2026-07-07T16:00:00Z', uuid '82def980-f1f0-4d7b-9cb0-db10720e1901'), -- Atlanta Mercedes-Benz
  (96, timestamptz '2026-07-07T20:00:00Z', uuid '2fe03ff0-88b5-44ba-bb40-82aa3b640879')  -- Vancouver BC Place
) as v(mn, k, vid)
where m.match_number = v.mn and m.stage = 'r16';
