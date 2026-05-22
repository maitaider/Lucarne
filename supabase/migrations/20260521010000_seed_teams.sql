-- =============================================================================
-- Lucarne — Seed: 48 équipes qualifiées au Mondial 2026
-- =============================================================================
-- Notes:
--   * Liste plausible au 21 mai 2026 (qualification réelle peut différer).
--   * 3 pays hôtes (USA/CAN/MEX) + 45 qualifiés par confédération.
--   * Logos non remplis ici — à uploader vers Supabase Storage et lier ensuite.
-- =============================================================================

insert into ref.teams (fifa_code, name_fr, name_en, iso_code, flag_emoji, confederation) values

-- Hôtes / CONCACAF
('USA', 'États-Unis', 'United States', 'US', '🇺🇸', 'CONCACAF'),
('CAN', 'Canada', 'Canada', 'CA', '🇨🇦', 'CONCACAF'),
('MEX', 'Mexique', 'Mexico', 'MX', '🇲🇽', 'CONCACAF'),
('CRC', 'Costa Rica', 'Costa Rica', 'CR', '🇨🇷', 'CONCACAF'),
('PAN', 'Panama', 'Panama', 'PA', '🇵🇦', 'CONCACAF'),
('JAM', 'Jamaïque', 'Jamaica', 'JM', '🇯🇲', 'CONCACAF'),

-- CONMEBOL (Amérique du Sud)
('ARG', 'Argentine', 'Argentina', 'AR', '🇦🇷', 'CONMEBOL'),
('BRA', 'Brésil', 'Brazil', 'BR', '🇧🇷', 'CONMEBOL'),
('URU', 'Uruguay', 'Uruguay', 'UY', '🇺🇾', 'CONMEBOL'),
('COL', 'Colombie', 'Colombia', 'CO', '🇨🇴', 'CONMEBOL'),
('ECU', 'Équateur', 'Ecuador', 'EC', '🇪🇨', 'CONMEBOL'),
('PAR', 'Paraguay', 'Paraguay', 'PY', '🇵🇾', 'CONMEBOL'),

-- UEFA (Europe) — 16 places
('FRA', 'France', 'France', 'FR', '🇫🇷', 'UEFA'),
('GER', 'Allemagne', 'Germany', 'DE', '🇩🇪', 'UEFA'),
('ESP', 'Espagne', 'Spain', 'ES', '🇪🇸', 'UEFA'),
('POR', 'Portugal', 'Portugal', 'PT', '🇵🇹', 'UEFA'),
('ITA', 'Italie', 'Italy', 'IT', '🇮🇹', 'UEFA'),
('ENG', 'Angleterre', 'England', 'GB', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'UEFA'),
('NED', 'Pays-Bas', 'Netherlands', 'NL', '🇳🇱', 'UEFA'),
('BEL', 'Belgique', 'Belgium', 'BE', '🇧🇪', 'UEFA'),
('CRO', 'Croatie', 'Croatia', 'HR', '🇭🇷', 'UEFA'),
('SUI', 'Suisse', 'Switzerland', 'CH', '🇨🇭', 'UEFA'),
('DEN', 'Danemark', 'Denmark', 'DK', '🇩🇰', 'UEFA'),
('POL', 'Pologne', 'Poland', 'PL', '🇵🇱', 'UEFA'),
('SWE', 'Suède', 'Sweden', 'SE', '🇸🇪', 'UEFA'),
('NOR', 'Norvège', 'Norway', 'NO', '🇳🇴', 'UEFA'),
('AUT', 'Autriche', 'Austria', 'AT', '🇦🇹', 'UEFA'),
('TUR', 'Turquie', 'Türkiye', 'TR', '🇹🇷', 'UEFA'),

-- CAF (Afrique) — 9 places
('MAR', 'Maroc', 'Morocco', 'MA', '🇲🇦', 'CAF'),
('SEN', 'Sénégal', 'Senegal', 'SN', '🇸🇳', 'CAF'),
('ALG', 'Algérie', 'Algeria', 'DZ', '🇩🇿', 'CAF'),
('EGY', 'Égypte', 'Egypt', 'EG', '🇪🇬', 'CAF'),
('NGA', 'Nigeria', 'Nigeria', 'NG', '🇳🇬', 'CAF'),
('TUN', 'Tunisie', 'Tunisia', 'TN', '🇹🇳', 'CAF'),
('CMR', 'Cameroun', 'Cameroon', 'CM', '🇨🇲', 'CAF'),
('GHA', 'Ghana', 'Ghana', 'GH', '🇬🇭', 'CAF'),
('CIV', 'Côte d''Ivoire', 'Ivory Coast', 'CI', '🇨🇮', 'CAF'),

-- AFC (Asie) — 8 places
('JPN', 'Japon', 'Japan', 'JP', '🇯🇵', 'AFC'),
('KOR', 'Corée du Sud', 'South Korea', 'KR', '🇰🇷', 'AFC'),
('IRN', 'Iran', 'Iran', 'IR', '🇮🇷', 'AFC'),
('KSA', 'Arabie Saoudite', 'Saudi Arabia', 'SA', '🇸🇦', 'AFC'),
('AUS', 'Australie', 'Australia', 'AU', '🇦🇺', 'AFC'),
('QAT', 'Qatar', 'Qatar', 'QA', '🇶🇦', 'AFC'),
('IRQ', 'Irak', 'Iraq', 'IQ', '🇮🇶', 'AFC'),
('UAE', 'Émirats Arabes Unis', 'United Arab Emirates', 'AE', '🇦🇪', 'AFC'),

-- OFC (Océanie) — 1 place
('NZL', 'Nouvelle-Zélande', 'New Zealand', 'NZ', '🇳🇿', 'OFC'),

-- Playoffs intercontinentaux (2 places restantes)
('BOL', 'Bolivie', 'Bolivia', 'BO', '🇧🇴', 'CONMEBOL'),
('NCL', 'Nouvelle-Calédonie', 'New Caledonia', 'NC', '🇳🇨', 'OFC');

-- =============================================================================
-- Venues — 16 stades hôtes du Mondial 2026
-- =============================================================================

insert into ref.venues (name, city_fr, city_en, country, capacity) values
('MetLife Stadium',           'East Rutherford', 'East Rutherford', 'USA', 82500),
('SoFi Stadium',              'Los Angeles',     'Los Angeles',     'USA', 70240),
('AT&T Stadium',              'Arlington',       'Arlington',       'USA', 80000),
('Levi''s Stadium',           'Santa Clara',     'Santa Clara',     'USA', 68500),
('Lincoln Financial Field',   'Philadelphie',    'Philadelphia',    'USA', 67594),
('NRG Stadium',               'Houston',         'Houston',         'USA', 72220),
('Mercedes-Benz Stadium',     'Atlanta',         'Atlanta',         'USA', 71000),
('Hard Rock Stadium',         'Miami Gardens',   'Miami Gardens',   'USA', 65326),
('Arrowhead Stadium',         'Kansas City',     'Kansas City',     'USA', 76416),
('Gillette Stadium',          'Foxborough',      'Foxborough',      'USA', 64628),
('Lumen Field',               'Seattle',         'Seattle',         'USA', 68740),
('BC Place',                  'Vancouver',       'Vancouver',       'CAN', 54500),
('BMO Field',                 'Toronto',         'Toronto',         'CAN', 45736),
('Estadio Azteca',            'Mexico',          'Mexico City',     'MEX', 87000),
('Estadio Akron',             'Guadalajara',     'Guadalajara',     'MEX', 49850),
('Estadio BBVA',              'Monterrey',       'Monterrey',       'MEX', 53500);
