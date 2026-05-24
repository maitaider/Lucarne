-- =============================================================================
-- Seed: marquee World Cup 2026 squads
-- =============================================================================
-- Source: official FA / FIFA squad announcements May 2026, scraped via
-- WebSearch / WebFetch. See commit message for source links per team.
--
-- Coverage (Phase 1 — ~10 marquee teams):
--   France (FRA)        26 ─ Deschamps,  announced 2026-05-22
--   England (ENG)       26 ─ Tuchel,     announced 2026-05-22
--   Brazil (BRA)        26 ─ Ancelotti,  announced 2026-05-18
--   Spain (ESP)         27 ─ De la Fuente, announced 2026-05-12
--   Portugal (POR)      27 ─ Martinez,   announced 2026-05-19  (4 GKs incl. travel reserve)
--   Germany (GER)       26 ─ Nagelsmann, announced 2026-05-21
--   Netherlands (NED)   28 ─ Koeman,     preliminary
--   USA (USA)           25 ─ Pochettino, announced 2026-05-23
--   Argentina (ARG)     ~18 ─ Scaloni,   stars only (full list 2026-05-30)
--   Mexico (MEX)        24 ─ Aguirre,    near-final
--   Canada (CAN)        ~14 ─ Marsch,    locks only (full list 2026-05-29)
--   Morocco (MAR)       ~13 ─ Ouahbi,    likely starters only
-- Admin can add/remove individual players via /admin/players once final
-- rosters land.
-- =============================================================================

-- Helper: only insert if team exists. We resolve team_id by fifa_code so we
-- don't have to hard-code uuids.
do $$
declare
  t record;
begin

-- ─── FRANCE ────────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'FRA';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Mike Maignan',          'Maignan',     'GK',  'AC Milan',           true),
      (t.id, 'Brice Samba',           'Samba',       'GK',  'Rennes',             true),
      (t.id, 'Robin Risser',          'Risser',      'GK',  'Lens',               true),
      (t.id, 'Dayot Upamecano',       'Upamecano',   'DEF', 'Bayern Munich',      true),
      (t.id, 'William Saliba',        'Saliba',      'DEF', 'Arsenal',            true),
      (t.id, 'Ibrahima Konaté',       'Konaté',      'DEF', 'Liverpool',          true),
      (t.id, 'Lucas Hernandez',       'L. Hernandez','DEF', 'Paris Saint-Germain',true),
      (t.id, 'Malo Gusto',            'Gusto',       'DEF', 'Chelsea',            true),
      (t.id, 'Jules Koundé',          'Koundé',      'DEF', 'Barcelona',          true),
      (t.id, 'Lucas Digne',           'Digne',       'DEF', 'Aston Villa',        true),
      (t.id, 'Theo Hernandez',        'T. Hernandez','DEF', 'Al-Hilal',           true),
      (t.id, 'Maxence Lacroix',       'Lacroix',     'DEF', 'Crystal Palace',     true),
      (t.id, 'Adrien Rabiot',         'Rabiot',      'MID', 'AC Milan',           true),
      (t.id, 'Aurélien Tchouaméni',   'Tchouaméni',  'MID', 'Real Madrid',        true),
      (t.id, 'N''Golo Kanté',         'Kanté',       'MID', 'Fenerbahçe',         true),
      (t.id, 'Manu Koné',             'Koné',        'MID', 'Roma',               true),
      (t.id, 'Warren Zaïre-Emery',    'Zaïre-Emery', 'MID', 'Paris Saint-Germain',true),
      (t.id, 'Kylian Mbappé',         'Mbappé',      'FWD', 'Real Madrid',        true),
      (t.id, 'Ousmane Dembélé',       'Dembélé',     'FWD', 'Paris Saint-Germain',true),
      (t.id, 'Michael Olise',         'Olise',       'FWD', 'Bayern Munich',      true),
      (t.id, 'Rayan Cherki',          'Cherki',      'FWD', 'Manchester City',    true),
      (t.id, 'Désiré Doué',           'Doué',        'FWD', 'Paris Saint-Germain',true),
      (t.id, 'Bradley Barcola',       'Barcola',     'FWD', 'Paris Saint-Germain',true),
      (t.id, 'Marcus Thuram',         'M. Thuram',   'FWD', 'Inter Milan',        true),
      (t.id, 'Maghnes Akliouche',     'Akliouche',   'FWD', 'Monaco',             true),
      (t.id, 'Jean-Philippe Mateta',  'Mateta',      'FWD', 'Crystal Palace',     true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── ENGLAND ───────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'ENG';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Jordan Pickford',  'Pickford',  'GK',  'Everton',           true),
      (t.id, 'Dean Henderson',   'D. Henderson','GK','Crystal Palace',    true),
      (t.id, 'James Trafford',   'Trafford',  'GK',  'Manchester City',   true),
      (t.id, 'Reece James',      'James',     'DEF', 'Chelsea',           true),
      (t.id, 'Ezri Konsa',       'Konsa',     'DEF', 'Aston Villa',       true),
      (t.id, 'Jarell Quansah',   'Quansah',   'DEF', 'Bayer Leverkusen',  true),
      (t.id, 'John Stones',      'Stones',    'DEF', 'Manchester City',   true),
      (t.id, 'Marc Guéhi',       'Guéhi',     'DEF', 'Manchester City',   true),
      (t.id, 'Dan Burn',         'Burn',      'DEF', 'Newcastle United',  true),
      (t.id, 'Nico O''Reilly',   'O''Reilly', 'DEF', 'Manchester City',   true),
      (t.id, 'Djed Spence',      'Spence',    'DEF', 'Tottenham Hotspur', true),
      (t.id, 'Tino Livramento',  'Livramento','DEF', 'Newcastle United',  true),
      (t.id, 'Declan Rice',      'Rice',      'MID', 'Arsenal',           true),
      (t.id, 'Elliot Anderson',  'Anderson',  'MID', 'Nottingham Forest', true),
      (t.id, 'Kobbie Mainoo',    'Mainoo',    'MID', 'Manchester United', true),
      (t.id, 'Jordan Henderson', 'J. Henderson','MID','Brentford',        true),
      (t.id, 'Morgan Rogers',    'Rogers',    'MID', 'Aston Villa',       true),
      (t.id, 'Jude Bellingham',  'Bellingham','MID', 'Real Madrid',       true),
      (t.id, 'Eberechi Eze',     'Eze',       'MID', 'Arsenal',           true),
      (t.id, 'Harry Kane',       'Kane',      'FWD', 'Bayern Munich',     true),
      (t.id, 'Ivan Toney',       'Toney',     'FWD', 'Al-Ahli',           true),
      (t.id, 'Ollie Watkins',    'Watkins',   'FWD', 'Aston Villa',       true),
      (t.id, 'Bukayo Saka',      'Saka',      'FWD', 'Arsenal',           true),
      (t.id, 'Marcus Rashford',  'Rashford',  'FWD', 'Barcelona',         true),
      (t.id, 'Anthony Gordon',   'Gordon',    'FWD', 'Newcastle United',  true),
      (t.id, 'Noni Madueke',     'Madueke',   'FWD', 'Arsenal',           true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── BRAZIL ────────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'BRA';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Alisson Becker',     'Alisson',      'GK',  'Liverpool',          true),
      (t.id, 'Ederson Moraes',     'Ederson',      'GK',  'Manchester City',    true),
      (t.id, 'Weverton Pereira',   'Weverton',     'GK',  'Palmeiras',          true),
      (t.id, 'Wesley França',      'Wesley',       'DEF', 'Roma',               true),
      (t.id, 'Douglas Santos',     'D. Santos',    'DEF', 'Zenit',              true),
      (t.id, 'Alex Sandro',        'Alex Sandro',  'DEF', 'Flamengo',           true),
      (t.id, 'Gabriel Magalhães',  'G. Magalhães', 'DEF', 'Arsenal',            true),
      (t.id, 'Marquinhos',         'Marquinhos',   'DEF', 'Paris Saint-Germain',true),
      (t.id, 'Danilo Luiz',        'Danilo',       'DEF', 'Flamengo',           true),
      (t.id, 'Bremer',             'Bremer',       'DEF', 'Juventus',           true),
      (t.id, 'Roger Ibañez',       'Ibañez',       'DEF', 'Al-Ahli',            true),
      (t.id, 'Léo Pereira',        'Léo Pereira',  'DEF', 'Flamengo',           true),
      (t.id, 'Bruno Guimarães',    'B. Guimarães', 'MID', 'Newcastle United',   true),
      (t.id, 'Casemiro',           'Casemiro',     'MID', 'Manchester United',  true),
      (t.id, 'Danilo Pereira dos Santos','Danilinho','MID','Botafogo',          true),
      (t.id, 'Fabinho Tavares',    'Fabinho',      'MID', 'Al-Ittihad',         true),
      (t.id, 'Lucas Paquetá',      'Paquetá',      'MID', 'West Ham',           true),
      (t.id, 'Raphinha Dias',      'Raphinha',     'FWD', 'Barcelona',          true),
      (t.id, 'Neymar Jr',          'Neymar',       'FWD', 'Santos',             true),
      (t.id, 'Vinícius Júnior',    'Vini Jr.',     'FWD', 'Real Madrid',        true),
      (t.id, 'Luiz Henrique',      'L. Henrique',  'FWD', 'Zenit',              true),
      (t.id, 'Matheus Cunha',      'Cunha',        'FWD', 'Manchester United',  true),
      (t.id, 'Gabriel Martinelli', 'Martinelli',   'FWD', 'Arsenal',            true),
      (t.id, 'Igor Thiago',        'Igor Thiago',  'FWD', 'Brentford',          true),
      (t.id, 'Endrick Felipe',     'Endrick',      'FWD', 'Lyon',               true),
      (t.id, 'Rayan Lucas',        'Rayan',        'FWD', 'Bournemouth',        true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── SPAIN ─────────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'ESP';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Unai Simón',          'Simón',      'GK',  'Athletic Club',      true),
      (t.id, 'David Raya',          'Raya',       'GK',  'Arsenal',            true),
      (t.id, 'Álex Remiro',         'Remiro',     'GK',  'Real Sociedad',      true),
      (t.id, 'Joan García',         'J. García',  'GK',  'Barcelona',          true),
      (t.id, 'Marcos Llorente',     'Llorente',   'DEF', 'Atlético Madrid',    true),
      (t.id, 'Pedro Porro',         'Porro',      'DEF', 'Tottenham',          true),
      (t.id, 'Aymeric Laporte',     'Laporte',    'DEF', 'Athletic Club',      true),
      (t.id, 'Pau Cubarsí',         'Cubarsí',    'DEF', 'Barcelona',          true),
      (t.id, 'Dean Huijsen',        'Huijsen',    'DEF', 'Real Madrid',        true),
      (t.id, 'Cristhian Mosquera',  'Mosquera',   'DEF', 'Arsenal',            true),
      (t.id, 'Marc Cucurella',      'Cucurella',  'DEF', 'Chelsea',            true),
      (t.id, 'Alejandro Grimaldo',  'Grimaldo',   'DEF', 'Bayer Leverkusen',   true),
      (t.id, 'Rodrigo Hernández',   'Rodri',      'MID', 'Manchester City',    true),
      (t.id, 'Martín Zubimendi',    'Zubimendi',  'MID', 'Arsenal',            true),
      (t.id, 'Pedri González',      'Pedri',      'MID', 'Barcelona',          true),
      (t.id, 'Pablo Fornals',       'Fornals',    'MID', 'Real Betis',         true),
      (t.id, 'Carlos Soler',        'Soler',      'MID', 'Real Sociedad',      true),
      (t.id, 'Dani Olmo',           'Olmo',       'MID', 'Barcelona',          true),
      (t.id, 'Fermín López',        'Fermín',     'MID', 'Barcelona',          true),
      (t.id, 'Yeremy Pino',         'Yeremy',     'FWD', 'Crystal Palace',     true),
      (t.id, 'Álex Baena',          'Baena',      'FWD', 'Atlético Madrid',    true),
      (t.id, 'Ander Barrenetxea',   'Barrenetxea','FWD', 'Real Sociedad',      true),
      (t.id, 'Mikel Oyarzabal',     'Oyarzabal',  'FWD', 'Real Sociedad',      true),
      (t.id, 'Ferran Torres',       'Ferran',     'FWD', 'Barcelona',          true),
      (t.id, 'Borja Iglesias',      'Borja',      'FWD', 'Celta Vigo',         true),
      (t.id, 'Lamine Yamal',        'Yamal',      'FWD', 'Barcelona',          true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── PORTUGAL ──────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'POR';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Diogo Costa',          'D. Costa',   'GK',  'Porto',              true),
      (t.id, 'José Sá',              'J. Sá',      'GK',  'Wolves',             true),
      (t.id, 'Rui Silva',            'R. Silva',   'GK',  'Sporting CP',        true),
      (t.id, 'Ricardo Velho',        'Velho',      'GK',  'Braga',              true),
      (t.id, 'João Cancelo',         'Cancelo',    'DEF', 'Al-Hilal',           true),
      (t.id, 'Diogo Dalot',          'Dalot',      'DEF', 'Manchester United',  true),
      (t.id, 'Rúben Dias',           'R. Dias',    'DEF', 'Manchester City',    true),
      (t.id, 'Gonçalo Inácio',       'Inácio',     'DEF', 'Sporting CP',        true),
      (t.id, 'Nuno Mendes',          'N. Mendes',  'DEF', 'Paris Saint-Germain',true),
      (t.id, 'Renato Veiga',         'Veiga',      'DEF', 'Villarreal',         true),
      (t.id, 'Matheus Nunes',        'M. Nunes',   'DEF', 'Manchester City',    true),
      (t.id, 'Nelson Semedo',        'Semedo',     'DEF', 'Fenerbahçe',         true),
      (t.id, 'Tomás Araújo',         'Araújo',     'DEF', 'Benfica',            true),
      (t.id, 'Bruno Fernandes',      'B. Fernandes','MID','Manchester United',  true),
      (t.id, 'João Neves',           'J. Neves',   'MID', 'Paris Saint-Germain',true),
      (t.id, 'Bernardo Silva',       'B. Silva',   'MID', 'Manchester City',    true),
      (t.id, 'Vitinha',              'Vitinha',    'MID', 'Paris Saint-Germain',true),
      (t.id, 'Rúben Neves',          'R. Neves',   'MID', 'Al-Hilal',           true),
      (t.id, 'Samu Costa',           'S. Costa',   'MID', 'Mallorca',           true),
      (t.id, 'Cristiano Ronaldo',    'Ronaldo',    'FWD', 'Al-Nassr',           true),
      (t.id, 'Rafael Leão',          'Leão',       'FWD', 'AC Milan',           true),
      (t.id, 'Pedro Neto',           'P. Neto',    'FWD', 'Chelsea',            true),
      (t.id, 'Francisco Conceição',  'F. Conceição','FWD','Juventus',           true),
      (t.id, 'João Félix',           'Félix',      'FWD', 'Al-Nassr',           true),
      (t.id, 'Gonçalo Guedes',       'Guedes',     'FWD', 'Real Sociedad',      true),
      (t.id, 'Gonçalo Ramos',        'G. Ramos',   'FWD', 'Paris Saint-Germain',true),
      (t.id, 'Francisco Trincão',    'Trincão',    'FWD', 'Sporting CP',        true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── GERMANY ───────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'GER';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Manuel Neuer',        'Neuer',         'GK',  'Bayern Munich',     true),
      (t.id, 'Oliver Baumann',      'Baumann',       'GK',  'Hoffenheim',        true),
      (t.id, 'Alexander Nübel',     'Nübel',         'GK',  'Stuttgart',         true),
      (t.id, 'Jonas Urbig',         'Urbig',         'GK',  'Bayern Munich',     true),
      (t.id, 'Jonathan Tah',        'Tah',           'DEF', 'Bayern Munich',     true),
      (t.id, 'Joshua Kimmich',      'Kimmich',       'DEF', 'Bayern Munich',     true),
      (t.id, 'Nico Schlotterbeck',  'Schlotterbeck', 'DEF', 'Borussia Dortmund', true),
      (t.id, 'Antonio Rüdiger',     'Rüdiger',       'DEF', 'Real Madrid',       true),
      (t.id, 'David Raum',          'Raum',          'DEF', 'RB Leipzig',        true),
      (t.id, 'Nathaniel Brown',     'N. Brown',      'DEF', 'Eintracht Frankfurt',true),
      (t.id, 'Waldemar Anton',      'Anton',         'DEF', 'Borussia Dortmund', true),
      (t.id, 'Malick Thiaw',        'Thiaw',         'DEF', 'Newcastle United',  true),
      (t.id, 'Pascal Groß',         'Groß',          'MID', 'Borussia Dortmund', true),
      (t.id, 'Leon Goretzka',       'Goretzka',      'MID', 'Bayern Munich',     true),
      (t.id, 'Aleksandar Pavlović', 'Pavlović',      'MID', 'Bayern Munich',     true),
      (t.id, 'Felix Nmecha',        'Nmecha',        'MID', 'Borussia Dortmund', true),
      (t.id, 'Nadiem Amiri',        'Amiri',         'MID', 'Mainz',             true),
      (t.id, 'Angelo Stiller',      'Stiller',       'MID', 'Stuttgart',         true),
      (t.id, 'Kai Havertz',         'Havertz',       'FWD', 'Arsenal',           true),
      (t.id, 'Nick Woltemade',      'Woltemade',     'FWD', 'Stuttgart',         true),
      (t.id, 'Deniz Undav',         'Undav',         'FWD', 'Stuttgart',         true),
      (t.id, 'Jamal Musiala',       'Musiala',       'FWD', 'Bayern Munich',     true),
      (t.id, 'Florian Wirtz',       'Wirtz',         'FWD', 'Liverpool',         true),
      (t.id, 'Lennart Karl',        'Karl',          'FWD', 'Bayern Munich',     true),
      (t.id, 'Jamie Leweling',      'Leweling',      'FWD', 'Stuttgart',         true),
      (t.id, 'Leroy Sané',          'Sané',          'FWD', 'Galatasaray',       true),
      (t.id, 'Maximilian Beier',    'Beier',         'FWD', 'Borussia Dortmund', true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── NETHERLANDS (preliminary 28) ─────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'NED';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Bart Verbruggen',    'Verbruggen',  'GK',  'Brighton',          true),
      (t.id, 'Justin Bijlow',      'Bijlow',      'GK',  'Feyenoord',         true),
      (t.id, 'Mark Flekken',       'Flekken',     'GK',  'Bayer Leverkusen',  true),
      (t.id, 'Robin Roefs',        'Roefs',       'GK',  'NEC Nijmegen',      true),
      (t.id, 'Lutsharel Geertruida','Geertruida', 'DEF', 'RB Leipzig',        true),
      (t.id, 'Jeremie Frimpong',   'Frimpong',    'DEF', 'Liverpool',         true),
      (t.id, 'Denzel Dumfries',    'Dumfries',    'DEF', 'Inter Milan',       true),
      (t.id, 'Jurriën Timber',     'J. Timber',   'DEF', 'Arsenal',           true),
      (t.id, 'Jan Paul van Hecke', 'Van Hecke',   'DEF', 'Brighton',          true),
      (t.id, 'Virgil van Dijk',    'Van Dijk',    'DEF', 'Liverpool',         true),
      (t.id, 'Nathan Aké',         'Aké',         'DEF', 'Manchester City',   true),
      (t.id, 'Stefan de Vrij',     'De Vrij',     'DEF', 'Inter Milan',       true),
      (t.id, 'Micky van de Ven',   'Van de Ven',  'DEF', 'Tottenham',         true),
      (t.id, 'Jorrel Hato',        'Hato',        'DEF', 'Chelsea',           true),
      (t.id, 'Ryan Gravenberch',   'Gravenberch', 'MID', 'Liverpool',         true),
      (t.id, 'Tijjani Reijnders',  'Reijnders',   'MID', 'Manchester City',   true),
      (t.id, 'Jerdy Schouten',     'Schouten',    'MID', 'PSV',               true),
      (t.id, 'Teun Koopmeiners',   'Koopmeiners', 'MID', 'Juventus',          true),
      (t.id, 'Kees Smit',          'Smit',        'MID', 'AZ Alkmaar',        true),
      (t.id, 'Quinten Timber',     'Q. Timber',   'MID', 'Feyenoord',         true),
      (t.id, 'Frenkie de Jong',    'De Jong',     'MID', 'Barcelona',         true),
      (t.id, 'Luciano Valente',    'Valente',     'MID', 'Feyenoord',         true),
      (t.id, 'Noa Lang',           'Lang',        'FWD', 'PSV',               true),
      (t.id, 'Donyell Malen',      'Malen',       'FWD', 'Aston Villa',       true),
      (t.id, 'Memphis Depay',      'Depay',       'FWD', 'Corinthians',       true),
      (t.id, 'Cody Gakpo',         'Gakpo',       'FWD', 'Liverpool',         true),
      (t.id, 'Brian Brobbey',      'Brobbey',     'FWD', 'Ajax',              true),
      (t.id, 'Wout Weghorst',      'Weghorst',    'FWD', 'Ajax',              true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── USA ───────────────────────────────────────────────────────────────────
  select id into t from ref.teams where fifa_code = 'USA';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Matt Turner',         'Turner',     'GK',  'New England Revolution',true),
      (t.id, 'Matt Freese',         'Freese',     'GK',  'New York City FC',   true),
      (t.id, 'Chris Brady',         'Brady',      'GK',  'Chicago Fire',       true),
      (t.id, 'Antonee Robinson',    'Robinson',   'DEF', 'Fulham',             true),
      (t.id, 'Chris Richards',      'Richards',   'DEF', 'Crystal Palace',     true),
      (t.id, 'Sergiño Dest',        'Dest',       'DEF', 'PSV Eindhoven',      true),
      (t.id, 'Tim Ream',            'Ream',       'DEF', 'Charlotte FC',       true),
      (t.id, 'Joe Scally',          'Scally',     'DEF', 'Borussia M''gladbach',true),
      (t.id, 'Alex Freeman',        'Freeman',    'DEF', 'Villarreal',         true),
      (t.id, 'Mark McKenzie',       'McKenzie',   'DEF', 'Toulouse',           true),
      (t.id, 'Auston Trusty',       'Trusty',     'DEF', 'Celtic',             true),
      (t.id, 'Max Arfsten',         'Arfsten',    'DEF', 'Columbus Crew',      true),
      (t.id, 'Miles Robinson',      'M. Robinson','DEF', 'FC Cincinnati',      true),
      (t.id, 'Weston McKennie',     'McKennie',   'MID', 'Juventus',           true),
      (t.id, 'Tyler Adams',         'Adams',      'MID', 'Bournemouth',        true),
      (t.id, 'Cristian Roldan',     'Roldan',     'MID', 'Seattle Sounders',   true),
      (t.id, 'Sebastian Berhalter', 'Berhalter',  'MID', 'Vancouver Whitecaps',true),
      (t.id, 'Christian Pulisic',   'Pulisic',    'MID', 'AC Milan',           true),
      (t.id, 'Gio Reyna',           'Reyna',      'MID', 'Borussia M''gladbach',true),
      (t.id, 'Timothy Weah',        'Weah',       'MID', 'Marseille',          true),
      (t.id, 'Brenden Aaronson',    'Aaronson',   'MID', 'Leeds United',       true),
      (t.id, 'Malik Tillman',       'Tillman',    'MID', 'Bayer Leverkusen',   true),
      (t.id, 'Alejandro Zendejas',  'Zendejas',   'MID', 'Club América',       true),
      (t.id, 'Folarin Balogun',     'Balogun',    'FWD', 'AS Monaco',          true),
      (t.id, 'Haji Wright',         'Wright',     'FWD', 'Coventry City',      true),
      (t.id, 'Ricardo Pepi',        'Pepi',       'FWD', 'PSV Eindhoven',      true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── ARGENTINA (stars + likely starters) ──────────────────────────────────
  select id into t from ref.teams where fifa_code = 'ARG';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Emiliano Martínez',   'E. Martínez',  'GK',  'Aston Villa',       true),
      (t.id, 'Gerónimo Rulli',      'Rulli',        'GK',  'Marseille',         true),
      (t.id, 'Cristian Romero',     'Romero',       'DEF', 'Tottenham',         true),
      (t.id, 'Nicolás Otamendi',    'Otamendi',     'DEF', 'Benfica',           true),
      (t.id, 'Lisandro Martínez',   'L. Martínez',  'DEF', 'Manchester United', true),
      (t.id, 'Nahuel Molina',       'Molina',       'DEF', 'Atlético Madrid',   true),
      (t.id, 'Marcos Acuña',        'Acuña',        'DEF', 'River Plate',       true),
      (t.id, 'Nicolás Tagliafico',  'Tagliafico',   'DEF', 'Lyon',              true),
      (t.id, 'Gonzalo Montiel',     'Montiel',      'DEF', 'River Plate',       true),
      (t.id, 'Rodrigo De Paul',     'De Paul',      'MID', 'Inter Miami',       true),
      (t.id, 'Enzo Fernández',      'E. Fernández', 'MID', 'Chelsea',           true),
      (t.id, 'Alexis Mac Allister', 'Mac Allister', 'MID', 'Liverpool',         true),
      (t.id, 'Leandro Paredes',     'Paredes',      'MID', 'Boca Juniors',      true),
      (t.id, 'Giovani Lo Celso',    'Lo Celso',     'MID', 'Real Betis',        true),
      (t.id, 'Lionel Messi',        'Messi',        'FWD', 'Inter Miami',       true),
      (t.id, 'Lautaro Martínez',    'Lautaro',      'FWD', 'Inter Milan',       true),
      (t.id, 'Julián Álvarez',      'J. Álvarez',   'FWD', 'Atlético Madrid',   true),
      (t.id, 'Nicolás González',    'N. González',  'FWD', 'Juventus',          true),
      (t.id, 'Thiago Almada',       'Almada',       'FWD', 'Olympique Lyonnais',true),
      (t.id, 'Alejandro Garnacho',  'Garnacho',     'FWD', 'Chelsea',           true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── MEXICO (24 near-final, final 2 spots TBD) ───────────────────────────
  select id into t from ref.teams where fifa_code = 'MEX';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Raúl Rangel',         'Rangel',     'GK',  'Chivas',             true),
      (t.id, 'Guillermo Ochoa',     'Ochoa',      'GK',  'AVS',                true),
      (t.id, 'Carlos Acevedo',      'Acevedo',    'GK',  'Santos Laguna',      true),
      (t.id, 'Israel Reyes',        'Reyes',      'DEF', 'Club América',       true),
      (t.id, 'Jesús Gallardo',      'Gallardo',   'DEF', 'Toluca',             true),
      (t.id, 'Jorge Sánchez',       'J. Sánchez', 'DEF', 'Cruz Azul',          true),
      (t.id, 'Mateo Chávez',        'Chávez',     'DEF', 'Chivas',             true),
      (t.id, 'César Montes',        'Montes',     'DEF', 'Lokomotiv Moscow',   true),
      (t.id, 'Johan Vásquez',       'Vásquez',    'DEF', 'Genoa',              true),
      (t.id, 'Edson Álvarez',       'E. Álvarez', 'MID', 'Fenerbahçe',         true),
      (t.id, 'Luis Romo',           'Romo',       'MID', 'Cruz Azul',          true),
      (t.id, 'Gilberto Mora',       'Mora',       'MID', 'Tijuana',            true),
      (t.id, 'Erik Lira',           'Lira',       'MID', 'Cruz Azul',          true),
      (t.id, 'Brian Gutiérrez',     'Gutiérrez',  'MID', 'Chicago Fire',       true),
      (t.id, 'Roberto Alvarado',    'Alvarado',   'MID', 'Chivas',             true),
      (t.id, 'Álvaro Fidalgo',      'Fidalgo',    'MID', 'Club América',       true),
      (t.id, 'Obed Vargas',         'Vargas',     'MID', 'Seattle Sounders',   true),
      (t.id, 'Alexis Vega',         'Vega',       'MID', 'Toluca',             true),
      (t.id, 'Orbelín Pineda',      'Pineda',     'MID', 'AEK Athens',         true),
      (t.id, 'Raúl Jiménez',        'Jiménez',    'FWD', 'Fulham',             true),
      (t.id, 'Santiago Giménez',    'S. Giménez', 'FWD', 'AC Milan',           true),
      (t.id, 'Julián Quiñones',     'Quiñones',   'FWD', 'Al-Qadsiah',         true),
      (t.id, 'Armando González',    'A. González','FWD', 'Chivas',             true),
      (t.id, 'Guillermo Martínez',  'G. Martínez','FWD', 'Pumas',              true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── CANADA (locks only, full squad reveal 2026-05-29) ───────────────────
  select id into t from ref.teams where fifa_code = 'CAN';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Maxime Crépeau',      'Crépeau',    'GK',  'Portland Timbers',  true),
      (t.id, 'Dayne St. Clair',     'St. Clair',  'GK',  'Minnesota United',  true),
      (t.id, 'Alphonso Davies',     'Davies',     'DEF', 'Bayern Munich',     true),
      (t.id, 'Alistair Johnston',   'Johnston',   'DEF', 'Celtic',            true),
      (t.id, 'Moïse Bombito',       'Bombito',    'DEF', 'OGC Nice',          true),
      (t.id, 'Derek Cornelius',     'Cornelius',  'DEF', 'Marseille',         true),
      (t.id, 'Richie Laryea',       'Laryea',     'DEF', 'Toronto FC',        true),
      (t.id, 'Niko Sigur',          'Sigur',      'DEF', 'Hajduk Split',      true),
      (t.id, 'Luc De Fougerolles',  'De Fougerolles','DEF','Fulham',          true),
      (t.id, 'Stephen Eustáquio',   'Eustáquio',  'MID', 'Porto',             true),
      (t.id, 'Jonathan Osorio',     'Osorio',     'MID', 'Toronto FC',        true),
      (t.id, 'Ismaël Koné',         'I. Koné',    'MID', 'Sassuolo',          true),
      (t.id, 'Jonathan David',      'J. David',   'FWD', 'Juventus',          true),
      (t.id, 'Cyle Larin',          'Larin',      'FWD', 'Cádiz',             true),
      (t.id, 'Tani Oluwaseyi',      'Oluwaseyi',  'FWD', 'Minnesota United',  true),
      (t.id, 'Theo Bair',           'Bair',       'FWD', 'Saint-Étienne',     true),
      (t.id, 'Promise David',       'P. David',   'FWD', 'Union Saint-Gilloise',true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

-- ─── MOROCCO (likely starters; full squad reveal ~2026-06-02) ────────────
  select id into t from ref.teams where fifa_code = 'MAR';
  if found then
    insert into ref.players (team_id, name, display_name, position, club, active) values
      (t.id, 'Yassine Bounou',      'Bono',       'GK',  'Al-Hilal',          true),
      (t.id, 'Munir Mohamedi',      'Munir',      'GK',  'Al-Wehda',          true),
      (t.id, 'Achraf Hakimi',       'Hakimi',     'DEF', 'Paris Saint-Germain',true),
      (t.id, 'Noussair Mazraoui',   'Mazraoui',   'DEF', 'Manchester United', true),
      (t.id, 'Romain Saïss',        'Saïss',      'DEF', 'Al-Shabab',         true),
      (t.id, 'Nayef Aguerd',        'Aguerd',     'DEF', 'Real Sociedad',     true),
      (t.id, 'Achraf Dari',         'Dari',       'DEF', 'Panathinaikos',     true),
      (t.id, 'Sofyan Amrabat',      'Amrabat',    'MID', 'Fenerbahçe',        true),
      (t.id, 'Azzedine Ounahi',     'Ounahi',     'MID', 'Girona',            true),
      (t.id, 'Bilal El Khannous',   'El Khannous','MID', 'Leicester City',    true),
      (t.id, 'Brahim Díaz',         'Brahim',     'MID', 'Real Madrid',       true),
      (t.id, 'Hakim Ziyech',        'Ziyech',     'MID', 'Al-Duhail',         true),
      (t.id, 'Youssef En-Nesyri',   'En-Nesyri',  'FWD', 'Fenerbahçe',        true),
      (t.id, 'Soufiane Rahimi',     'Rahimi',     'FWD', 'Al-Ain',            true),
      (t.id, 'Ayoub El Kaabi',      'El Kaabi',   'FWD', 'Olympiacos',        true)
    on conflict (team_id, lower(name)) do nothing;
  end if;

end $$;

-- Final summary (logged at apply time)
do $$
declare
  v_count int;
  v_teams int;
begin
  select count(*) into v_count from ref.players;
  select count(distinct team_id) into v_teams from ref.players;
  raise notice 'Seeded % players across % teams', v_count, v_teams;
end $$;
