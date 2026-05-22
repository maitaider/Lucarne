-- =============================================================================
-- Lucarne — Seed: 104 matchs Mondial 2026 (12 groupes × 6 + 32 phase finale)
-- =============================================================================
-- Notes:
--   * Distribution de groupes plausible (pas le tirage officiel FIFA).
--   * Dates approximatives selon le format officiel : 11 juin → 19 juillet 2026.
--   * 4 matchs/jour en phase de groupes, montant à 6/jour vers la fin.
--   * R32 = nouveauté du format à 48 équipes (avant : direct en R16).
-- =============================================================================

-- 1. Phase de groupes (72 matchs)
with match_data (stage, grp, match_no, home_code, away_code, ko_at, venue_name) as (
  values
    -- ===== GROUP A : MEX, ITA, EGY, AUS =====
    ('group', 'A',  1, 'MEX', 'ITA', '2026-06-11 03:00:00+00'::timestamptz, 'Estadio Azteca'),
    ('group', 'A',  2, 'EGY', 'AUS', '2026-06-12 20:00:00+00'::timestamptz, 'SoFi Stadium'),
    ('group', 'A',  3, 'MEX', 'EGY', '2026-06-17 03:00:00+00'::timestamptz, 'Estadio Azteca'),
    ('group', 'A',  4, 'AUS', 'ITA', '2026-06-17 21:00:00+00'::timestamptz, 'Estadio Akron'),
    ('group', 'A',  5, 'AUS', 'MEX', '2026-06-23 03:00:00+00'::timestamptz, 'Estadio BBVA'),
    ('group', 'A',  6, 'ITA', 'EGY', '2026-06-23 03:00:00+00'::timestamptz, 'MetLife Stadium'),

    -- ===== GROUP B : CAN, URU, NGA, IRQ =====
    ('group', 'B',  7, 'CAN', 'URU', '2026-06-12 00:00:00+00'::timestamptz, 'BMO Field'),
    ('group', 'B',  8, 'NGA', 'IRQ', '2026-06-12 17:00:00+00'::timestamptz, 'Lumen Field'),
    ('group', 'B',  9, 'CAN', 'NGA', '2026-06-17 00:00:00+00'::timestamptz, 'BC Place'),
    ('group', 'B', 10, 'IRQ', 'URU', '2026-06-18 20:00:00+00'::timestamptz, 'Lincoln Financial Field'),
    ('group', 'B', 11, 'IRQ', 'CAN', '2026-06-22 20:00:00+00'::timestamptz, 'BMO Field'),
    ('group', 'B', 12, 'URU', 'NGA', '2026-06-22 20:00:00+00'::timestamptz, 'NRG Stadium'),

    -- ===== GROUP C : USA, JPN, MAR, NOR =====
    ('group', 'C', 13, 'USA', 'JPN', '2026-06-12 23:00:00+00'::timestamptz, 'AT&T Stadium'),
    ('group', 'C', 14, 'MAR', 'NOR', '2026-06-13 17:00:00+00'::timestamptz, 'Gillette Stadium'),
    ('group', 'C', 15, 'USA', 'MAR', '2026-06-18 23:00:00+00'::timestamptz, 'Levi''s Stadium'),
    ('group', 'C', 16, 'NOR', 'JPN', '2026-06-18 17:00:00+00'::timestamptz, 'Mercedes-Benz Stadium'),
    ('group', 'C', 17, 'NOR', 'USA', '2026-06-23 23:00:00+00'::timestamptz, 'Arrowhead Stadium'),
    ('group', 'C', 18, 'JPN', 'MAR', '2026-06-23 23:00:00+00'::timestamptz, 'Hard Rock Stadium'),

    -- ===== GROUP D : ARG, KOR, TUN, NZL =====
    ('group', 'D', 19, 'ARG', 'KOR', '2026-06-13 20:00:00+00'::timestamptz, 'MetLife Stadium'),
    ('group', 'D', 20, 'TUN', 'NZL', '2026-06-14 00:00:00+00'::timestamptz, 'SoFi Stadium'),
    ('group', 'D', 21, 'ARG', 'TUN', '2026-06-19 20:00:00+00'::timestamptz, 'AT&T Stadium'),
    ('group', 'D', 22, 'NZL', 'KOR', '2026-06-19 17:00:00+00'::timestamptz, 'NRG Stadium'),
    ('group', 'D', 23, 'NZL', 'ARG', '2026-06-24 03:00:00+00'::timestamptz, 'Lincoln Financial Field'),
    ('group', 'D', 24, 'KOR', 'TUN', '2026-06-24 00:00:00+00'::timestamptz, 'Levi''s Stadium'),

    -- ===== GROUP E : FRA, CRO, ALG, GHA =====
    ('group', 'E', 25, 'FRA', 'CRO', '2026-06-14 20:00:00+00'::timestamptz, 'MetLife Stadium'),
    ('group', 'E', 26, 'ALG', 'GHA', '2026-06-14 17:00:00+00'::timestamptz, 'Hard Rock Stadium'),
    ('group', 'E', 27, 'FRA', 'ALG', '2026-06-19 23:00:00+00'::timestamptz, 'Lumen Field'),
    ('group', 'E', 28, 'GHA', 'CRO', '2026-06-20 17:00:00+00'::timestamptz, 'Gillette Stadium'),
    ('group', 'E', 29, 'GHA', 'FRA', '2026-06-25 23:00:00+00'::timestamptz, 'BC Place'),
    ('group', 'E', 30, 'CRO', 'ALG', '2026-06-25 17:00:00+00'::timestamptz, 'Arrowhead Stadium'),

    -- ===== GROUP F : BRA, SEN, AUT, UAE =====
    ('group', 'F', 31, 'BRA', 'SEN', '2026-06-14 23:00:00+00'::timestamptz, 'SoFi Stadium'),
    ('group', 'F', 32, 'AUT', 'UAE', '2026-06-15 20:00:00+00'::timestamptz, 'BMO Field'),
    ('group', 'F', 33, 'BRA', 'AUT', '2026-06-20 23:00:00+00'::timestamptz, 'AT&T Stadium'),
    ('group', 'F', 34, 'UAE', 'SEN', '2026-06-20 17:00:00+00'::timestamptz, 'Mercedes-Benz Stadium'),
    ('group', 'F', 35, 'UAE', 'BRA', '2026-06-26 03:00:00+00'::timestamptz, 'Estadio BBVA'),
    ('group', 'F', 36, 'SEN', 'AUT', '2026-06-26 03:00:00+00'::timestamptz, 'NRG Stadium'),

    -- ===== GROUP G : ENG, COL, IRN, JAM =====
    ('group', 'G', 37, 'ENG', 'COL', '2026-06-15 17:00:00+00'::timestamptz, 'MetLife Stadium'),
    ('group', 'G', 38, 'IRN', 'JAM', '2026-06-15 23:00:00+00'::timestamptz, 'Lumen Field'),
    ('group', 'G', 39, 'ENG', 'IRN', '2026-06-21 17:00:00+00'::timestamptz, 'Lincoln Financial Field'),
    ('group', 'G', 40, 'JAM', 'COL', '2026-06-21 23:00:00+00'::timestamptz, 'Hard Rock Stadium'),
    ('group', 'G', 41, 'JAM', 'ENG', '2026-06-26 17:00:00+00'::timestamptz, 'AT&T Stadium'),
    ('group', 'G', 42, 'COL', 'IRN', '2026-06-26 23:00:00+00'::timestamptz, 'Levi''s Stadium'),

    -- ===== GROUP H : ESP, DEN, KSA, CIV =====
    ('group', 'H', 43, 'ESP', 'DEN', '2026-06-16 20:00:00+00'::timestamptz, 'Estadio Akron'),
    ('group', 'H', 44, 'KSA', 'CIV', '2026-06-16 17:00:00+00'::timestamptz, 'Gillette Stadium'),
    ('group', 'H', 45, 'ESP', 'KSA', '2026-06-22 03:00:00+00'::timestamptz, 'SoFi Stadium'),
    ('group', 'H', 46, 'CIV', 'DEN', '2026-06-21 17:00:00+00'::timestamptz, 'BMO Field'),
    ('group', 'H', 47, 'CIV', 'ESP', '2026-06-27 03:00:00+00'::timestamptz, 'NRG Stadium'),
    ('group', 'H', 48, 'DEN', 'KSA', '2026-06-27 00:00:00+00'::timestamptz, 'MetLife Stadium'),

    -- ===== GROUP I : GER, ECU, TUR, NCL =====
    ('group', 'I', 49, 'GER', 'ECU', '2026-06-16 23:00:00+00'::timestamptz, 'Mercedes-Benz Stadium'),
    ('group', 'I', 50, 'TUR', 'NCL', '2026-06-17 17:00:00+00'::timestamptz, 'Arrowhead Stadium'),
    ('group', 'I', 51, 'GER', 'TUR', '2026-06-22 23:00:00+00'::timestamptz, 'Lincoln Financial Field'),
    ('group', 'I', 52, 'NCL', 'ECU', '2026-06-22 17:00:00+00'::timestamptz, 'Lumen Field'),
    ('group', 'I', 53, 'NCL', 'GER', '2026-06-27 17:00:00+00'::timestamptz, 'BC Place'),
    ('group', 'I', 54, 'ECU', 'TUR', '2026-06-27 17:00:00+00'::timestamptz, 'AT&T Stadium'),

    -- ===== GROUP J : POR, SUI, CMR, QAT =====
    ('group', 'J', 55, 'POR', 'SUI', '2026-06-13 23:00:00+00'::timestamptz, 'Gillette Stadium'),
    ('group', 'J', 56, 'CMR', 'QAT', '2026-06-13 17:00:00+00'::timestamptz, 'Mercedes-Benz Stadium'),
    ('group', 'J', 57, 'POR', 'CMR', '2026-06-18 20:00:00+00'::timestamptz, 'Hard Rock Stadium'),
    ('group', 'J', 58, 'QAT', 'SUI', '2026-06-18 17:00:00+00'::timestamptz, 'Lincoln Financial Field'),
    ('group', 'J', 59, 'QAT', 'POR', '2026-06-24 23:00:00+00'::timestamptz, 'Mercedes-Benz Stadium'),
    ('group', 'J', 60, 'SUI', 'CMR', '2026-06-24 17:00:00+00'::timestamptz, 'Estadio Akron'),

    -- ===== GROUP K : NED, POL, PAR, CRC =====
    ('group', 'K', 61, 'NED', 'POL', '2026-06-14 20:00:00+00'::timestamptz, 'Hard Rock Stadium'),
    ('group', 'K', 62, 'PAR', 'CRC', '2026-06-15 00:00:00+00'::timestamptz, 'NRG Stadium'),
    ('group', 'K', 63, 'NED', 'PAR', '2026-06-19 17:00:00+00'::timestamptz, 'BMO Field'),
    ('group', 'K', 64, 'CRC', 'POL', '2026-06-20 23:00:00+00'::timestamptz, 'Estadio Azteca'),
    ('group', 'K', 65, 'CRC', 'NED', '2026-06-25 20:00:00+00'::timestamptz, 'Estadio BBVA'),
    ('group', 'K', 66, 'POL', 'PAR', '2026-06-25 23:00:00+00'::timestamptz, 'SoFi Stadium'),

    -- ===== GROUP L : BEL, SWE, BOL, PAN =====
    ('group', 'L', 67, 'BEL', 'SWE', '2026-06-15 20:00:00+00'::timestamptz, 'Levi''s Stadium'),
    ('group', 'L', 68, 'BOL', 'PAN', '2026-06-16 00:00:00+00'::timestamptz, 'Arrowhead Stadium'),
    ('group', 'L', 69, 'BEL', 'BOL', '2026-06-21 20:00:00+00'::timestamptz, 'Estadio Akron'),
    ('group', 'L', 70, 'PAN', 'SWE', '2026-06-21 23:00:00+00'::timestamptz, 'BC Place'),
    ('group', 'L', 71, 'PAN', 'BEL', '2026-06-27 21:00:00+00'::timestamptz, 'Estadio Azteca'),
    ('group', 'L', 72, 'SWE', 'BOL', '2026-06-27 21:00:00+00'::timestamptz, 'BMO Field')
)
insert into ref.matches (stage, group_label, match_number, home_team_id, away_team_id, kickoff_at, venue_id)
select
  md.stage::match_stage, md.grp, md.match_no,
  ht.id, at.id, md.ko_at, v.id
from match_data md
left join ref.teams ht on ht.fifa_code = md.home_code
left join ref.teams at on at.fifa_code = md.away_code
left join ref.venues v on v.name = md.venue_name;

-- 2. Round of 32 (16 matchs, 28 juin → 3 juillet)
-- Placeholders : winners/runners-up de chaque groupe + 8 best 3rd-placed
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select stage::match_stage, match_no, hp, ap, ko_at::timestamptz, v.id
from (values
  ('r32',  73, '1A', '3CDE', '2026-06-28 17:00:00+00', 'SoFi Stadium'),
  ('r32',  74, '1B', '3ACD', '2026-06-28 21:00:00+00', 'Hard Rock Stadium'),
  ('r32',  75, '1C', '3DEF', '2026-06-29 17:00:00+00', 'AT&T Stadium'),
  ('r32',  76, '1D', '3BEF', '2026-06-29 21:00:00+00', 'MetLife Stadium'),
  ('r32',  77, '1E', '3ABF', '2026-06-30 17:00:00+00', 'Mercedes-Benz Stadium'),
  ('r32',  78, '1F', '2J',   '2026-06-30 21:00:00+00', 'NRG Stadium'),
  ('r32',  79, '1G', '2K',   '2026-07-01 17:00:00+00', 'Lumen Field'),
  ('r32',  80, '1H', '2L',   '2026-07-01 21:00:00+00', 'Estadio Azteca'),
  ('r32',  81, '1I', '2A',   '2026-07-02 17:00:00+00', 'BC Place'),
  ('r32',  82, '1J', '2B',   '2026-07-02 21:00:00+00', 'BMO Field'),
  ('r32',  83, '1K', '2C',   '2026-07-03 17:00:00+00', 'Lincoln Financial Field'),
  ('r32',  84, '1L', '2D',   '2026-07-03 21:00:00+00', 'Estadio Akron'),
  ('r32',  85, '2E', '2F',   '2026-06-29 00:00:00+00', 'Gillette Stadium'),
  ('r32',  86, '2G', '2H',   '2026-06-30 00:00:00+00', 'Arrowhead Stadium'),
  ('r32',  87, '2I', '3GHI', '2026-07-01 00:00:00+00', 'Levi''s Stadium'),
  ('r32',  88, '3JKL', '3HIJ', '2026-07-02 00:00:00+00', 'Estadio BBVA')
) as t(stage, match_no, hp, ap, ko_at, venue_name)
left join ref.venues v on v.name = t.venue_name;

-- 3. Round of 16 (8 matchs, 4-7 juillet)
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select stage::match_stage, match_no, hp, ap, ko_at::timestamptz, v.id
from (values
  ('r16',  89, 'W73', 'W74', '2026-07-04 17:00:00+00', 'SoFi Stadium'),
  ('r16',  90, 'W75', 'W76', '2026-07-04 21:00:00+00', 'MetLife Stadium'),
  ('r16',  91, 'W77', 'W78', '2026-07-05 17:00:00+00', 'AT&T Stadium'),
  ('r16',  92, 'W79', 'W80', '2026-07-05 21:00:00+00', 'Hard Rock Stadium'),
  ('r16',  93, 'W81', 'W82', '2026-07-06 17:00:00+00', 'BC Place'),
  ('r16',  94, 'W83', 'W84', '2026-07-06 21:00:00+00', 'Lumen Field'),
  ('r16',  95, 'W85', 'W86', '2026-07-07 17:00:00+00', 'Lincoln Financial Field'),
  ('r16',  96, 'W87', 'W88', '2026-07-07 21:00:00+00', 'Estadio Azteca')
) as t(stage, match_no, hp, ap, ko_at, venue_name)
left join ref.venues v on v.name = t.venue_name;

-- 4. Quarter-finals (4 matchs, 9-11 juillet)
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select stage::match_stage, match_no, hp, ap, ko_at::timestamptz, v.id
from (values
  ('qf',   97, 'W89', 'W90', '2026-07-09 21:00:00+00', 'MetLife Stadium'),
  ('qf',   98, 'W91', 'W92', '2026-07-10 21:00:00+00', 'AT&T Stadium'),
  ('qf',   99, 'W93', 'W94', '2026-07-11 17:00:00+00', 'SoFi Stadium'),
  ('qf',  100, 'W95', 'W96', '2026-07-11 21:00:00+00', 'BMO Field')
) as t(stage, match_no, hp, ap, ko_at, venue_name)
left join ref.venues v on v.name = t.venue_name;

-- 5. Semi-finals (2 matchs, 14-15 juillet)
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select stage::match_stage, match_no, hp, ap, ko_at::timestamptz, v.id
from (values
  ('sf',  101, 'W97', 'W98', '2026-07-14 21:00:00+00', 'AT&T Stadium'),
  ('sf',  102, 'W99', 'W100', '2026-07-15 21:00:00+00', 'MetLife Stadium')
) as t(stage, match_no, hp, ap, ko_at, venue_name)
left join ref.venues v on v.name = t.venue_name;

-- 6. Third-place playoff (18 juillet)
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select 'third_place'::match_stage, 103, 'L101', 'L102',
       '2026-07-18 20:00:00+00'::timestamptz, v.id
from ref.venues v where v.name = 'Hard Rock Stadium';

-- 7. Final (19 juillet, MetLife Stadium)
insert into ref.matches (stage, match_number, home_placeholder, away_placeholder, kickoff_at, venue_id)
select 'final'::match_stage, 104, 'W101', 'W102',
       '2026-07-19 19:00:00+00'::timestamptz, v.id
from ref.venues v where v.name = 'MetLife Stadium';
