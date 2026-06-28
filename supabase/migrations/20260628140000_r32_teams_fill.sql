-- Remplit les équipes des 16 matchs de 16e de finale (R32) une fois la phase de
-- groupes terminée (72/72 matchs joués). Les lignes R32 existaient déjà avec
-- leurs placeholders (1A, 2B, 3ACDF…) mais home_team_id/away_team_id = NULL ;
-- aucun mécanisme serveur ne résout le bracket réel (admin_set_match_result ne
-- gère que score/statut/buteurs), donc on l'écrit ici.
--
-- ATTENTION : les match_number de l'app NE correspondent PAS aux numéros FIFA
-- (cf. mémoire lucarne-calendar-validation) — on s'appuie sur la PAIRE de
-- placeholders réelle de chaque ligne, pas sur le numéro officiel.
--
-- Classements de groupe (tie-break FIFA : pts → diff → bp, puis confrontation
-- directe entre ex æquo), calculés depuis les 72 résultats en base :
--   A: 1.MEX 2.RSA 3.KOR      G: 1.BEL 2.EGY 3.IRN
--   B: 1.SUI 2.CAN 3.BIH      H: 1.ESP 2.CPV 3.URU
--   C: 1.BRA 2.MAR 3.SCO      I: 1.FRA 2.NOR 3.SEN
--   D: 1.USA 2.AUS 3.PAR      J: 1.ARG 2.AUT 3.ALG
--   E: 1.GER 2.CIV 3.ECU      K: 1.COL 2.POR 3.COD
--   F: 1.NED 2.JPN 3.SWE      L: 1.ENG 2.CRO 3.GHA
--
-- 8 meilleurs 3es (qualifiés) → groupes B, D, E, F, I, J, K, L
--   (COD K+1, SWE F0/7, ECU E0/2, GHA L0/2, BIH B-1, ALG J-2/5, PAR D-2/2, SEN I3+2 ;
--    éliminés : IRN, KOR, SCO, URU).
-- Table d'allocation officielle FIFA 2026, ligne BDEFIJKL :
--   1A↔3E, 1B↔3J, 1D↔3B, 1E↔3D, 1G↔3I, 1I↔3F, 1K↔3L, 1L↔3K.
--
-- Aucun trigger AFTER ne se déclenche : announce_match_result /
-- notify_followers_match_result gardent status='finished' (ici scheduled),
-- settle_match_bets idem, recompute_bracket_on_result ne vise que r16+.

update ref.matches m
set home_team_id = ht.id,
    away_team_id = at.id
from (values
  -- match_number, home (placeholder résolu), away (placeholder résolu)
  (73, 'RSA', 'CAN'),  -- 2A vs 2B
  (74, 'BRA', 'JPN'),  -- 1C vs 2F
  (75, 'GER', 'PAR'),  -- 1E vs 3D  (3e groupe D)
  (76, 'NED', 'MAR'),  -- 1F vs 2C
  (77, 'MEX', 'ECU'),  -- 1A vs 3E  (3e groupe E)
  (78, 'CIV', 'NOR'),  -- 2E vs 2I
  (79, 'FRA', 'SWE'),  -- 1I vs 3F  (3e groupe F)
  (80, 'USA', 'BIH'),  -- 1D vs 3B  (3e groupe B)
  (81, 'ENG', 'COD'),  -- 1L vs 3K  (3e groupe K)
  (82, 'BEL', 'SEN'),  -- 1G vs 3I  (3e groupe I)
  (83, 'ESP', 'AUT'),  -- 1H vs 2J
  (84, 'POR', 'CRO'),  -- 2K vs 2L
  (85, 'SUI', 'ALG'),  -- 1B vs 3J  (3e groupe J)
  (86, 'AUS', 'EGY'),  -- 2D vs 2G
  (87, 'ARG', 'CPV'),  -- 1J vs 2H
  (88, 'COL', 'GHA')   -- 1K vs 3L  (3e groupe L)
) as v(mn, home, away)
join ref.teams ht on ht.fifa_code = v.home
join ref.teams at on at.fifa_code = v.away
where m.match_number = v.mn and m.stage = 'r32';
