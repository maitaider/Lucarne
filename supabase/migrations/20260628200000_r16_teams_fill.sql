-- Remplit les équipes des 8 matchs de 8e de finale (R16) une fois les 16es (R32)
-- tous joués. Aucun mécanisme serveur ne propage les vainqueurs (cf. mémoire
-- lucarne-knockout-bracket-fill) → on résout ici chaque placeholder W<n> par le
-- vainqueur (winner_team_id) du match app numéro n.
--
-- Résolution GÉNÉRIQUE (pas de codes en dur) : W<n> = vainqueur du match n. Les
-- gardes winner_team_id IS NOT NULL évitent de vider un slot si une source
-- n'était pas résolue. Portable : sur un db:reset local sans résultats saisis,
-- les winner_team_id sont NULL → no-op (les 8es restent en placeholder, correct).
--
-- Affiches obtenues (vérifiées) :
--   M89 W73 vs W76 = Canada    vs Maroc       M93 W80 vs W82 = États-Unis vs Belgique
--   M90 W74 vs W78 = Brésil    vs Norvège     M94 W83 vs W84 = Espagne    vs Portugal
--   M91 W75 vs W77 = Paraguay  vs Mexique     M95 W85 vs W88 = Suisse     vs Colombie
--   M92 W79 vs W81 = France    vs Angleterre  M96 W86 vs W87 = Égypte     vs Argentine
--
-- Poser uniquement les équipes sur un match 'scheduled' ne déclenche aucun
-- trigger de résultat (announce/notify/settle gardent status='finished') ; le
-- trigger recompute_bracket_on_result (r16) relance un recalcul idempotent —
-- sans effet car les 8es ne sont pas encore joués.

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
