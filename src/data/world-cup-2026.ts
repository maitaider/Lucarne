import type { MatchListItem } from "@/lib/matches/queries";

export const WORLD_CUP_2026_DATA_SOURCE = {
  schedule: "FIFA official match schedule, mirrored as structured ET fixtures by WorldCupHub",
  teams: "WorldCupHub teams index, data from FIFA.com, last updated 2026-05-22",
  squads: "Key-player watchlists only; FIFA final 26-player rosters are due on 2026-06-02",
} as const;

export type WorldCupTeam = {
  fifa_code: string;
  name_fr: string;
  name_en: string;
  iso_code: string;
  confederation: string;
  group_label: string;
  ranking: number;
  key_players: string[];
};

export type WorldCupVenue = {
  name: string;
  city_fr: string;
  city_en: string;
  country: string;
  capacity: number;
  match_count: number;
};

const TEAMS_BASE = [
  {
    "fifa_code": "MEX",
    "name_fr": "Mexique",
    "name_en": "Mexico",
    "iso_code": "MX",
    "confederation": "CONCACAF",
    "group_label": "A",
    "ranking": 15
  },
  {
    "fifa_code": "RSA",
    "name_fr": "Afrique du Sud",
    "name_en": "South Africa",
    "iso_code": "ZA",
    "confederation": "CAF",
    "group_label": "A",
    "ranking": 60
  },
  {
    "fifa_code": "KOR",
    "name_fr": "Corée du Sud",
    "name_en": "South Korea",
    "iso_code": "KR",
    "confederation": "AFC",
    "group_label": "A",
    "ranking": 25
  },
  {
    "fifa_code": "CZE",
    "name_fr": "Tchéquie",
    "name_en": "Czechia",
    "iso_code": "CZ",
    "confederation": "UEFA",
    "group_label": "A",
    "ranking": 41
  },
  {
    "fifa_code": "CAN",
    "name_fr": "Canada",
    "name_en": "Canada",
    "iso_code": "CA",
    "confederation": "CONCACAF",
    "group_label": "B",
    "ranking": 39
  },
  {
    "fifa_code": "BIH",
    "name_fr": "Bosnie-Herzégovine",
    "name_en": "Bosnia & Herzegovina",
    "iso_code": "BA",
    "confederation": "UEFA",
    "group_label": "B",
    "ranking": 65
  },
  {
    "fifa_code": "QAT",
    "name_fr": "Qatar",
    "name_en": "Qatar",
    "iso_code": "QA",
    "confederation": "AFC",
    "group_label": "B",
    "ranking": 55
  },
  {
    "fifa_code": "SUI",
    "name_fr": "Suisse",
    "name_en": "Switzerland",
    "iso_code": "CH",
    "confederation": "UEFA",
    "group_label": "B",
    "ranking": 19
  },
  {
    "fifa_code": "BRA",
    "name_fr": "Brésil",
    "name_en": "Brazil",
    "iso_code": "BR",
    "confederation": "CONMEBOL",
    "group_label": "C",
    "ranking": 6
  },
  {
    "fifa_code": "MAR",
    "name_fr": "Maroc",
    "name_en": "Morocco",
    "iso_code": "MA",
    "confederation": "CAF",
    "group_label": "C",
    "ranking": 8
  },
  {
    "fifa_code": "HAI",
    "name_fr": "Haïti",
    "name_en": "Haiti",
    "iso_code": "HT",
    "confederation": "CONCACAF",
    "group_label": "C",
    "ranking": 83
  },
  {
    "fifa_code": "SCO",
    "name_fr": "Écosse",
    "name_en": "Scotland",
    "iso_code": "GB-SCT",
    "confederation": "UEFA",
    "group_label": "C",
    "ranking": 43
  },
  {
    "fifa_code": "USA",
    "name_fr": "États-Unis",
    "name_en": "United States",
    "iso_code": "US",
    "confederation": "CONCACAF",
    "group_label": "D",
    "ranking": 16
  },
  {
    "fifa_code": "PAR",
    "name_fr": "Paraguay",
    "name_en": "Paraguay",
    "iso_code": "PY",
    "confederation": "CONMEBOL",
    "group_label": "D",
    "ranking": 40
  },
  {
    "fifa_code": "AUS",
    "name_fr": "Australie",
    "name_en": "Australia",
    "iso_code": "AU",
    "confederation": "AFC",
    "group_label": "D",
    "ranking": 20
  },
  {
    "fifa_code": "TUR",
    "name_fr": "Turquie",
    "name_en": "Türkiye",
    "iso_code": "TR",
    "confederation": "UEFA",
    "group_label": "D",
    "ranking": 22
  },
  {
    "fifa_code": "GER",
    "name_fr": "Allemagne",
    "name_en": "Germany",
    "iso_code": "DE",
    "confederation": "UEFA",
    "group_label": "E",
    "ranking": 10
  },
  {
    "fifa_code": "CUW",
    "name_fr": "Curaçao",
    "name_en": "Curaçao",
    "iso_code": "CW",
    "confederation": "CONCACAF",
    "group_label": "E",
    "ranking": 82
  },
  {
    "fifa_code": "CIV",
    "name_fr": "Côte d’Ivoire",
    "name_en": "Ivory Coast",
    "iso_code": "CI",
    "confederation": "CAF",
    "group_label": "E",
    "ranking": 34
  },
  {
    "fifa_code": "ECU",
    "name_fr": "Équateur",
    "name_en": "Ecuador",
    "iso_code": "EC",
    "confederation": "CONMEBOL",
    "group_label": "E",
    "ranking": 23
  },
  {
    "fifa_code": "NED",
    "name_fr": "Pays-Bas",
    "name_en": "Netherlands",
    "iso_code": "NL",
    "confederation": "UEFA",
    "group_label": "F",
    "ranking": 7
  },
  {
    "fifa_code": "JPN",
    "name_fr": "Japon",
    "name_en": "Japan",
    "iso_code": "JP",
    "confederation": "AFC",
    "group_label": "F",
    "ranking": 18
  },
  {
    "fifa_code": "SWE",
    "name_fr": "Suède",
    "name_en": "Sweden",
    "iso_code": "SE",
    "confederation": "UEFA",
    "group_label": "F",
    "ranking": 38
  },
  {
    "fifa_code": "TUN",
    "name_fr": "Tunisie",
    "name_en": "Tunisia",
    "iso_code": "TN",
    "confederation": "CAF",
    "group_label": "F",
    "ranking": 44
  },
  {
    "fifa_code": "BEL",
    "name_fr": "Belgique",
    "name_en": "Belgium",
    "iso_code": "BE",
    "confederation": "UEFA",
    "group_label": "G",
    "ranking": 9
  },
  {
    "fifa_code": "EGY",
    "name_fr": "Égypte",
    "name_en": "Egypt",
    "iso_code": "EG",
    "confederation": "CAF",
    "group_label": "G",
    "ranking": 29
  },
  {
    "fifa_code": "IRN",
    "name_fr": "Iran",
    "name_en": "Iran",
    "iso_code": "IR",
    "confederation": "AFC",
    "group_label": "G",
    "ranking": 21
  },
  {
    "fifa_code": "NZL",
    "name_fr": "Nouvelle-Zélande",
    "name_en": "New Zealand",
    "iso_code": "NZ",
    "confederation": "OFC",
    "group_label": "G",
    "ranking": 89
  },
  {
    "fifa_code": "ESP",
    "name_fr": "Espagne",
    "name_en": "Spain",
    "iso_code": "ES",
    "confederation": "UEFA",
    "group_label": "H",
    "ranking": 2
  },
  {
    "fifa_code": "CPV",
    "name_fr": "Cap-Vert",
    "name_en": "Cape Verde",
    "iso_code": "CV",
    "confederation": "CAF",
    "group_label": "H",
    "ranking": 69
  },
  {
    "fifa_code": "KSA",
    "name_fr": "Arabie saoudite",
    "name_en": "Saudi Arabia",
    "iso_code": "SA",
    "confederation": "AFC",
    "group_label": "H",
    "ranking": 61
  },
  {
    "fifa_code": "URU",
    "name_fr": "Uruguay",
    "name_en": "Uruguay",
    "iso_code": "UY",
    "confederation": "CONMEBOL",
    "group_label": "H",
    "ranking": 17
  },
  {
    "fifa_code": "FRA",
    "name_fr": "France",
    "name_en": "France",
    "iso_code": "FR",
    "confederation": "UEFA",
    "group_label": "I",
    "ranking": 1
  },
  {
    "fifa_code": "SEN",
    "name_fr": "Sénégal",
    "name_en": "Senegal",
    "iso_code": "SN",
    "confederation": "CAF",
    "group_label": "I",
    "ranking": 14
  },
  {
    "fifa_code": "IRQ",
    "name_fr": "Irak",
    "name_en": "Iraq",
    "iso_code": "IQ",
    "confederation": "AFC",
    "group_label": "I",
    "ranking": 57
  },
  {
    "fifa_code": "NOR",
    "name_fr": "Norvège",
    "name_en": "Norway",
    "iso_code": "NO",
    "confederation": "UEFA",
    "group_label": "I",
    "ranking": 31
  },
  {
    "fifa_code": "ARG",
    "name_fr": "Argentine",
    "name_en": "Argentina",
    "iso_code": "AR",
    "confederation": "CONMEBOL",
    "group_label": "J",
    "ranking": 3
  },
  {
    "fifa_code": "ALG",
    "name_fr": "Algérie",
    "name_en": "Algeria",
    "iso_code": "DZ",
    "confederation": "CAF",
    "group_label": "J",
    "ranking": 28
  },
  {
    "fifa_code": "AUT",
    "name_fr": "Autriche",
    "name_en": "Austria",
    "iso_code": "AT",
    "confederation": "UEFA",
    "group_label": "J",
    "ranking": 24
  },
  {
    "fifa_code": "JOR",
    "name_fr": "Jordanie",
    "name_en": "Jordan",
    "iso_code": "JO",
    "confederation": "AFC",
    "group_label": "J",
    "ranking": 63
  },
  {
    "fifa_code": "POR",
    "name_fr": "Portugal",
    "name_en": "Portugal",
    "iso_code": "PT",
    "confederation": "UEFA",
    "group_label": "K",
    "ranking": 5
  },
  {
    "fifa_code": "COD",
    "name_fr": "RD Congo",
    "name_en": "DR Congo",
    "iso_code": "CD",
    "confederation": "CAF",
    "group_label": "K",
    "ranking": 46
  },
  {
    "fifa_code": "UZB",
    "name_fr": "Ouzbékistan",
    "name_en": "Uzbekistan",
    "iso_code": "UZ",
    "confederation": "AFC",
    "group_label": "K",
    "ranking": 50
  },
  {
    "fifa_code": "COL",
    "name_fr": "Colombie",
    "name_en": "Colombia",
    "iso_code": "CO",
    "confederation": "CONMEBOL",
    "group_label": "K",
    "ranking": 13
  },
  {
    "fifa_code": "ENG",
    "name_fr": "Angleterre",
    "name_en": "England",
    "iso_code": "GB-ENG",
    "confederation": "UEFA",
    "group_label": "L",
    "ranking": 4
  },
  {
    "fifa_code": "CRO",
    "name_fr": "Croatie",
    "name_en": "Croatia",
    "iso_code": "HR",
    "confederation": "UEFA",
    "group_label": "L",
    "ranking": 11
  },
  {
    "fifa_code": "GHA",
    "name_fr": "Ghana",
    "name_en": "Ghana",
    "iso_code": "GH",
    "confederation": "CAF",
    "group_label": "L",
    "ranking": 74
  },
  {
    "fifa_code": "PAN",
    "name_fr": "Panama",
    "name_en": "Panama",
    "iso_code": "PA",
    "confederation": "CONCACAF",
    "group_label": "L",
    "ranking": 33
  }
] as const;

export const WORLD_CUP_TEAMS: WorldCupTeam[] = TEAMS_BASE.map((team) => ({
  ...team,
  key_players: ({
  "MEX": [
    "Santiago Gimenez",
    "Edson Alvarez",
    "Hirving Lozano"
  ],
  "RSA": [
    "Ronwen Williams",
    "Percy Tau",
    "Teboho Mokoena"
  ],
  "KOR": [
    "Son Heung-min",
    "Kim Min-jae",
    "Lee Kang-in"
  ],
  "CZE": [
    "Patrik Schick",
    "Tomas Soucek",
    "Adam Hlozek"
  ],
  "CAN": [
    "Alphonso Davies",
    "Jonathan David",
    "Tajon Buchanan"
  ],
  "BIH": [
    "Edin Dzeko",
    "Sead Kolasinac",
    "Ermedin Demirovic"
  ],
  "QAT": [
    "Akram Afif",
    "Almoez Ali",
    "Meshaal Barsham"
  ],
  "SUI": [
    "Granit Xhaka",
    "Manuel Akanji",
    "Breel Embolo"
  ],
  "BRA": [
    "Vinicius Junior",
    "Rodrygo",
    "Alisson"
  ],
  "MAR": [
    "Achraf Hakimi",
    "Yassine Bounou",
    "Sofyan Amrabat"
  ],
  "HAI": [
    "Duckens Nazon",
    "Frantzdy Pierrot",
    "Jean-Ricner Bellegarde"
  ],
  "SCO": [
    "Scott McTominay",
    "Andy Robertson",
    "John McGinn"
  ],
  "USA": [
    "Christian Pulisic",
    "Weston McKennie",
    "Tyler Adams"
  ],
  "PAR": [
    "Miguel Almiron",
    "Julio Enciso",
    "Gustavo Gomez"
  ],
  "AUS": [
    "Mathew Ryan",
    "Harry Souttar",
    "Jackson Irvine"
  ],
  "TUR": [
    "Hakan Calhanoglu",
    "Arda Guler",
    "Kenan Yildiz"
  ],
  "GER": [
    "Jamal Musiala",
    "Florian Wirtz",
    "Joshua Kimmich"
  ],
  "CUW": [
    "Leandro Bacuna",
    "Juninho Bacuna",
    "Eloy Room"
  ],
  "CIV": [
    "Sebastien Haller",
    "Franck Kessie",
    "Simon Adingra"
  ],
  "ECU": [
    "Moises Caicedo",
    "Piero Hincapie",
    "Enner Valencia"
  ],
  "NED": [
    "Virgil van Dijk",
    "Frenkie de Jong",
    "Xavi Simons"
  ],
  "JPN": [
    "Takefusa Kubo",
    "Kaoru Mitoma",
    "Wataru Endo"
  ],
  "SWE": [
    "Viktor Gyokeres",
    "Alexander Isak",
    "Dejan Kulusevski"
  ],
  "TUN": [
    "Hannibal Mejbri",
    "Ellyes Skhiri",
    "Aissa Laidouni"
  ],
  "BEL": [
    "Kevin De Bruyne",
    "Romelu Lukaku",
    "Jeremy Doku"
  ],
  "EGY": [
    "Mohamed Salah",
    "Omar Marmoush",
    "Mostafa Mohamed"
  ],
  "IRN": [
    "Mehdi Taremi",
    "Sardar Azmoun",
    "Alireza Jahanbakhsh"
  ],
  "NZL": [
    "Chris Wood",
    "Liberato Cacace",
    "Ryan Thomas"
  ],
  "ESP": [
    "Lamine Yamal",
    "Pedri",
    "Rodri"
  ],
  "CPV": [
    "Vozinha",
    "Ryan Mendes",
    "Bebe"
  ],
  "KSA": [
    "Salem Al-Dawsari",
    "Firas Al-Buraikan",
    "Mohammed Al-Owais"
  ],
  "URU": [
    "Federico Valverde",
    "Darwin Nunez",
    "Ronald Araujo"
  ],
  "FRA": [
    "Kylian Mbappe",
    "Ousmane Dembele",
    "William Saliba"
  ],
  "SEN": [
    "Sadio Mane",
    "Kalidou Koulibaly",
    "Nicolas Jackson"
  ],
  "IRQ": [
    "Ali Al-Hamadi",
    "Aymen Hussein",
    "Zidane Iqbal"
  ],
  "NOR": [
    "Erling Haaland",
    "Martin Odegaard",
    "Antonio Nusa"
  ],
  "ARG": [
    "Lionel Messi",
    "Lautaro Martinez",
    "Emiliano Martinez"
  ],
  "ALG": [
    "Riyad Mahrez",
    "Ismael Bennacer",
    "Amine Gouiri"
  ],
  "AUT": [
    "David Alaba",
    "Marcel Sabitzer",
    "Christoph Baumgartner"
  ],
  "JOR": [
    "Mousa Al-Taamari",
    "Yazan Al-Naimat",
    "Nizar Al-Rashdan"
  ],
  "POR": [
    "Cristiano Ronaldo",
    "Bruno Fernandes",
    "Bernardo Silva"
  ],
  "COD": [
    "Yoane Wissa",
    "Chancel Mbemba",
    "Cedric Bakambu"
  ],
  "UZB": [
    "Eldor Shomurodov",
    "Abdukodir Khusanov",
    "Abbosbek Fayzullaev"
  ],
  "COL": [
    "Luis Diaz",
    "James Rodriguez",
    "Jhon Duran"
  ],
  "ENG": [
    "Harry Kane",
    "Jude Bellingham",
    "Bukayo Saka"
  ],
  "CRO": [
    "Luka Modric",
    "Josko Gvardiol",
    "Mateo Kovacic"
  ],
  "GHA": [
    "Mohammed Kudus",
    "Thomas Partey",
    "Inaki Williams"
  ],
  "PAN": [
    "Adalberto Carrasquilla",
    "Michael Murillo",
    "Jose Fajardo"
  ]
} as Record<string, string[]>)[team.fifa_code] ?? [],
}));

export const WORLD_CUP_VENUES: WorldCupVenue[] = [
  {
    "name": "Estadio Banorte",
    "city_fr": "Mexico",
    "city_en": "Mexico City",
    "country": "MEX",
    "capacity": 83264,
    "match_count": 4
  },
  {
    "name": "Estadio Akron",
    "city_fr": "Guadalajara",
    "city_en": "Guadalajara",
    "country": "MEX",
    "capacity": 48071,
    "match_count": 4
  },
  {
    "name": "Estadio BBVA",
    "city_fr": "Monterrey",
    "city_en": "Monterrey",
    "country": "MEX",
    "capacity": 53500,
    "match_count": 4
  },
  {
    "name": "BMO Field",
    "city_fr": "Toronto",
    "city_en": "Toronto",
    "country": "CAN",
    "capacity": 45736,
    "match_count": 6
  },
  {
    "name": "BC Place",
    "city_fr": "Vancouver",
    "city_en": "Vancouver",
    "country": "CAN",
    "capacity": 54500,
    "match_count": 6
  },
  {
    "name": "SoFi Stadium",
    "city_fr": "Los Angeles",
    "city_en": "Los Angeles",
    "country": "USA",
    "capacity": 70240,
    "match_count": 9
  },
  {
    "name": "Levi's Stadium",
    "city_fr": "San Francisco",
    "city_en": "San Francisco Bay Area",
    "country": "USA",
    "capacity": 70909,
    "match_count": 6
  },
  {
    "name": "MetLife Stadium",
    "city_fr": "New York",
    "city_en": "New York / New Jersey",
    "country": "USA",
    "capacity": 82500,
    "match_count": 8
  },
  {
    "name": "Gillette Stadium",
    "city_fr": "Boston",
    "city_en": "Boston",
    "country": "USA",
    "capacity": 65878,
    "match_count": 8
  },
  {
    "name": "NRG Stadium",
    "city_fr": "Houston",
    "city_en": "Houston",
    "country": "USA",
    "capacity": 72220,
    "match_count": 7
  },
  {
    "name": "AT&T Stadium",
    "city_fr": "Dallas",
    "city_en": "Dallas",
    "country": "USA",
    "capacity": 92967,
    "match_count": 9
  },
  {
    "name": "Lincoln Financial Field",
    "city_fr": "Philadelphie",
    "city_en": "Philadelphia",
    "country": "USA",
    "capacity": 69328,
    "match_count": 6
  },
  {
    "name": "Mercedes-Benz Stadium",
    "city_fr": "Atlanta",
    "city_en": "Atlanta",
    "country": "USA",
    "capacity": 74839,
    "match_count": 8
  },
  {
    "name": "Hard Rock Stadium",
    "city_fr": "Miami",
    "city_en": "Miami",
    "country": "USA",
    "capacity": 64767,
    "match_count": 7
  },
  {
    "name": "GEHA Field at Arrowhead Stadium",
    "city_fr": "Kansas City",
    "city_en": "Kansas City",
    "country": "USA",
    "capacity": 76416,
    "match_count": 6
  },
  {
    "name": "Lumen Field",
    "city_fr": "Seattle",
    "city_en": "Seattle",
    "country": "USA",
    "capacity": 69000,
    "match_count": 6
  }
];

export const WORLD_CUP_MATCH_ROWS = [
  {
    "kickoff_at": "2026-06-11T20:00:00.000Z",
    "home": "Mexico",
    "away": "South Africa",
    "venue": "Estadio Banorte",
    "round": "Grp A",
    "city": "Mexico City"
  },
  {
    "kickoff_at": "2026-06-12T03:00:00.000Z",
    "home": "South Korea",
    "away": "Czechia",
    "venue": "Estadio Akron",
    "round": "Grp A",
    "city": "Guadalajara"
  },
  {
    "kickoff_at": "2026-06-12T20:00:00.000Z",
    "home": "Canada",
    "away": "Bosnia & Herzegovina",
    "venue": "BMO Field",
    "round": "Grp B",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-06-13T02:00:00.000Z",
    "home": "United States",
    "away": "Paraguay",
    "venue": "SoFi Stadium",
    "round": "Grp D",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-13T20:00:00.000Z",
    "home": "Qatar",
    "away": "Switzerland",
    "venue": "Levi's Stadium",
    "round": "Grp B",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-06-13T23:00:00.000Z",
    "home": "Brazil",
    "away": "Morocco",
    "venue": "MetLife Stadium",
    "round": "Grp C",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-06-14T00:00:00.000Z",
    "home": "Ivory Coast",
    "away": "Ecuador",
    "venue": "Lincoln Financial Field",
    "round": "Grp E",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-06-14T02:00:00.000Z",
    "home": "Haiti",
    "away": "Scotland",
    "venue": "Gillette Stadium",
    "round": "Grp C",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-14T03:00:00.000Z",
    "home": "Sweden",
    "away": "Tunisia",
    "venue": "Estadio BBVA",
    "round": "Grp F",
    "city": "Monterrey"
  },
  {
    "kickoff_at": "2026-06-14T05:00:00.000Z",
    "home": "Australia",
    "away": "Türkiye",
    "venue": "BC Place",
    "round": "Grp D",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-06-14T18:00:00.000Z",
    "home": "Germany",
    "away": "Curaçao",
    "venue": "NRG Stadium",
    "round": "Grp E",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-14T21:00:00.000Z",
    "home": "Netherlands",
    "away": "Japan",
    "venue": "AT&T Stadium",
    "round": "Grp F",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-15T17:00:00.000Z",
    "home": "Spain",
    "away": "Cape Verde",
    "venue": "Mercedes-Benz Stadium",
    "round": "Grp H",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-06-15T20:00:00.000Z",
    "home": "Belgium",
    "away": "Egypt",
    "venue": "Lumen Field",
    "round": "Grp G",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-06-15T23:00:00.000Z",
    "home": "Saudi Arabia",
    "away": "Uruguay",
    "venue": "Hard Rock Stadium",
    "round": "Grp H",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-06-16T02:00:00.000Z",
    "home": "Iran",
    "away": "New Zealand",
    "venue": "SoFi Stadium",
    "round": "Grp G",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-16T02:00:00.000Z",
    "home": "Argentina",
    "away": "Algeria",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "Grp J",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-06-16T05:00:00.000Z",
    "home": "Austria",
    "away": "Jordan",
    "venue": "Levi's Stadium",
    "round": "Grp J",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-06-16T18:00:00.000Z",
    "home": "Portugal",
    "away": "DR Congo",
    "venue": "NRG Stadium",
    "round": "Grp K",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-16T20:00:00.000Z",
    "home": "France",
    "away": "Senegal",
    "venue": "MetLife Stadium",
    "round": "Grp I",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-06-16T21:00:00.000Z",
    "home": "England",
    "away": "Croatia",
    "venue": "AT&T Stadium",
    "round": "Grp L",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-16T23:00:00.000Z",
    "home": "Iraq",
    "away": "Norway",
    "venue": "Gillette Stadium",
    "round": "Grp I",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-17T00:00:00.000Z",
    "home": "Ghana",
    "away": "Panama",
    "venue": "BMO Field",
    "round": "Grp L",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-06-17T03:00:00.000Z",
    "home": "Uzbekistan",
    "away": "Colombia",
    "venue": "Estadio Banorte",
    "round": "Grp K",
    "city": "Mexico City"
  },
  {
    "kickoff_at": "2026-06-18T17:00:00.000Z",
    "home": "Czechia",
    "away": "South Africa",
    "venue": "Mercedes-Benz Stadium",
    "round": "Grp A",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-06-18T20:00:00.000Z",
    "home": "Switzerland",
    "away": "Bosnia & Herzegovina",
    "venue": "SoFi Stadium",
    "round": "Grp B",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-18T23:00:00.000Z",
    "home": "Canada",
    "away": "Qatar",
    "venue": "BC Place",
    "round": "Grp B",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-06-19T02:00:00.000Z",
    "home": "Mexico",
    "away": "South Korea",
    "venue": "Estadio Akron",
    "round": "Grp A",
    "city": "Guadalajara"
  },
  {
    "kickoff_at": "2026-06-19T20:00:00.000Z",
    "home": "United States",
    "away": "Australia",
    "venue": "Lumen Field",
    "round": "Grp D",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-06-19T23:00:00.000Z",
    "home": "Scotland",
    "away": "Morocco",
    "venue": "Gillette Stadium",
    "round": "Grp C",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-20T01:00:00.000Z",
    "home": "Ecuador",
    "away": "Curaçao",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "Grp E",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-06-20T02:00:00.000Z",
    "home": "Brazil",
    "away": "Haiti",
    "venue": "Lincoln Financial Field",
    "round": "Grp C",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-06-20T02:00:00.000Z",
    "home": "Türkiye",
    "away": "Paraguay",
    "venue": "Levi's Stadium",
    "round": "Grp D",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-06-20T18:00:00.000Z",
    "home": "Netherlands",
    "away": "Sweden",
    "venue": "NRG Stadium",
    "round": "Grp F",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-20T21:00:00.000Z",
    "home": "Germany",
    "away": "Ivory Coast",
    "venue": "BMO Field",
    "round": "Grp E",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-06-21T02:00:00.000Z",
    "home": "Tunisia",
    "away": "Japan",
    "venue": "Estadio BBVA",
    "round": "Grp F",
    "city": "Monterrey"
  },
  {
    "kickoff_at": "2026-06-21T02:00:00.000Z",
    "home": "New Zealand",
    "away": "Egypt",
    "venue": "BC Place",
    "round": "Grp G",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-06-21T17:00:00.000Z",
    "home": "Spain",
    "away": "Saudi Arabia",
    "venue": "Mercedes-Benz Stadium",
    "round": "Grp H",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-06-21T20:00:00.000Z",
    "home": "Belgium",
    "away": "Iran",
    "venue": "SoFi Stadium",
    "round": "Grp G",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-21T23:00:00.000Z",
    "home": "Uruguay",
    "away": "Cape Verde",
    "venue": "Hard Rock Stadium",
    "round": "Grp H",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-06-22T18:00:00.000Z",
    "home": "Argentina",
    "away": "Austria",
    "venue": "AT&T Stadium",
    "round": "Grp J",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-22T22:00:00.000Z",
    "home": "France",
    "away": "Iraq",
    "venue": "Lincoln Financial Field",
    "round": "Grp I",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-06-23T00:00:00.000Z",
    "home": "Panama",
    "away": "Croatia",
    "venue": "BMO Field",
    "round": "Grp L",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-06-23T01:00:00.000Z",
    "home": "Norway",
    "away": "Senegal",
    "venue": "MetLife Stadium",
    "round": "Grp I",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-06-23T03:00:00.000Z",
    "home": "Colombia",
    "away": "DR Congo",
    "venue": "Estadio Akron",
    "round": "Grp K",
    "city": "Guadalajara"
  },
  {
    "kickoff_at": "2026-06-23T18:00:00.000Z",
    "home": "Portugal",
    "away": "Uzbekistan",
    "venue": "NRG Stadium",
    "round": "Grp K",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-23T21:00:00.000Z",
    "home": "England",
    "away": "Ghana",
    "venue": "Gillette Stadium",
    "round": "Grp L",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-24T00:00:00.000Z",
    "home": "Jordan",
    "away": "Algeria",
    "venue": "Levi's Stadium",
    "round": "Grp J",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-06-24T20:00:00.000Z",
    "home": "Switzerland",
    "away": "Canada",
    "venue": "BC Place",
    "round": "Grp B",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-06-24T20:00:00.000Z",
    "home": "Bosnia & Herzegovina",
    "away": "Qatar",
    "venue": "Lumen Field",
    "round": "Grp B",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-06-24T23:00:00.000Z",
    "home": "Scotland",
    "away": "Brazil",
    "venue": "Hard Rock Stadium",
    "round": "Grp C",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-06-24T23:00:00.000Z",
    "home": "Morocco",
    "away": "Haiti",
    "venue": "Mercedes-Benz Stadium",
    "round": "Grp C",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-06-25T00:00:00.000Z",
    "home": "Japan",
    "away": "Sweden",
    "venue": "AT&T Stadium",
    "round": "Grp F",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-25T00:00:00.000Z",
    "home": "Tunisia",
    "away": "Netherlands",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "Grp F",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-06-25T02:00:00.000Z",
    "home": "Czechia",
    "away": "Mexico",
    "venue": "Estadio Banorte",
    "round": "Grp A",
    "city": "Mexico City"
  },
  {
    "kickoff_at": "2026-06-25T02:00:00.000Z",
    "home": "South Africa",
    "away": "South Korea",
    "venue": "Estadio BBVA",
    "round": "Grp A",
    "city": "Monterrey"
  },
  {
    "kickoff_at": "2026-06-25T03:00:00.000Z",
    "home": "Türkiye",
    "away": "United States",
    "venue": "SoFi Stadium",
    "round": "Grp D",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-25T03:00:00.000Z",
    "home": "Paraguay",
    "away": "Australia",
    "venue": "Levi's Stadium",
    "round": "Grp D",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-06-25T21:00:00.000Z",
    "home": "Ecuador",
    "away": "Germany",
    "venue": "MetLife Stadium",
    "round": "Grp E",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-06-25T21:00:00.000Z",
    "home": "Curaçao",
    "away": "Ivory Coast",
    "venue": "Lincoln Financial Field",
    "round": "Grp E",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-06-26T01:00:00.000Z",
    "home": "Cape Verde",
    "away": "Saudi Arabia",
    "venue": "NRG Stadium",
    "round": "Grp H",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-26T01:00:00.000Z",
    "home": "Uruguay",
    "away": "Spain",
    "venue": "Estadio Akron",
    "round": "Grp H",
    "city": "Guadalajara"
  },
  {
    "kickoff_at": "2026-06-26T04:00:00.000Z",
    "home": "Egypt",
    "away": "Iran",
    "venue": "Lumen Field",
    "round": "Grp G",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-06-26T04:00:00.000Z",
    "home": "New Zealand",
    "away": "Belgium",
    "venue": "BC Place",
    "round": "Grp G",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-06-26T20:00:00.000Z",
    "home": "Norway",
    "away": "France",
    "venue": "Gillette Stadium",
    "round": "Grp I",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-26T20:00:00.000Z",
    "home": "Senegal",
    "away": "Iraq",
    "venue": "BMO Field",
    "round": "Grp I",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-06-27T00:30:00.000Z",
    "home": "Colombia",
    "away": "Portugal",
    "venue": "Hard Rock Stadium",
    "round": "Grp K",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-06-27T00:30:00.000Z",
    "home": "DR Congo",
    "away": "Uzbekistan",
    "venue": "Mercedes-Benz Stadium",
    "round": "Grp K",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-06-27T03:00:00.000Z",
    "home": "Algeria",
    "away": "Austria",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "Grp J",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-06-27T03:00:00.000Z",
    "home": "Jordan",
    "away": "Argentina",
    "venue": "AT&T Stadium",
    "round": "Grp J",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-27T22:00:00.000Z",
    "home": "Panama",
    "away": "England",
    "venue": "MetLife Stadium",
    "round": "Grp L",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-06-27T22:00:00.000Z",
    "home": "Croatia",
    "away": "Ghana",
    "venue": "Lincoln Financial Field",
    "round": "Grp L",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-06-28T19:00:00.000Z",
    "home": "2A",
    "away": "2B",
    "venue": "SoFi Stadium",
    "round": "R32",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-06-29T17:00:00.000Z",
    "home": "1C",
    "away": "2F",
    "venue": "NRG Stadium",
    "round": "R32",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-06-29T20:30:00.000Z",
    "home": "1E",
    "away": "3ACDF",
    "venue": "Gillette Stadium",
    "round": "R32",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-06-30T00:00:00.000Z",
    "home": "1F",
    "away": "2C",
    "venue": "Estadio BBVA",
    "round": "R32",
    "city": "Monterrey"
  },
  {
    "kickoff_at": "2026-06-30T01:00:00.000Z",
    "home": "1A",
    "away": "3CEFHI",
    "venue": "Estadio Banorte",
    "round": "R32",
    "city": "Mexico City"
  },
  {
    "kickoff_at": "2026-06-30T17:00:00.000Z",
    "home": "2E",
    "away": "2I",
    "venue": "AT&T Stadium",
    "round": "R32",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-06-30T21:00:00.000Z",
    "home": "1I",
    "away": "3CDFGH",
    "venue": "MetLife Stadium",
    "round": "R32",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-07-01T00:00:00.000Z",
    "home": "1D",
    "away": "3BEFIJ",
    "venue": "Levi's Stadium",
    "round": "R32",
    "city": "San Francisco"
  },
  {
    "kickoff_at": "2026-07-01T16:00:00.000Z",
    "home": "1L",
    "away": "3EHIJK",
    "venue": "Mercedes-Benz Stadium",
    "round": "R32",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-07-01T20:00:00.000Z",
    "home": "1G",
    "away": "3AEHIJ",
    "venue": "Lumen Field",
    "round": "R32",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-07-02T19:00:00.000Z",
    "home": "1H",
    "away": "2J",
    "venue": "SoFi Stadium",
    "round": "R32",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-07-02T23:00:00.000Z",
    "home": "2K",
    "away": "2L",
    "venue": "BMO Field",
    "round": "R32",
    "city": "Toronto"
  },
  {
    "kickoff_at": "2026-07-03T03:00:00.000Z",
    "home": "1B",
    "away": "3EFGIJ",
    "venue": "BC Place",
    "round": "R32",
    "city": "Vancouver"
  },
  {
    "kickoff_at": "2026-07-03T18:00:00.000Z",
    "home": "2D",
    "away": "2G",
    "venue": "AT&T Stadium",
    "round": "R32",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-07-03T22:00:00.000Z",
    "home": "1J",
    "away": "2H",
    "venue": "Hard Rock Stadium",
    "round": "R32",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-07-04T01:30:00.000Z",
    "home": "1K",
    "away": "3DEIJL",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "R32",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-07-04T19:00:00.000Z",
    "home": "W73",
    "away": "W76",
    "venue": "NRG Stadium",
    "round": "R16",
    "city": "Houston"
  },
  {
    "kickoff_at": "2026-07-04T23:00:00.000Z",
    "home": "W74",
    "away": "W78",
    "venue": "SoFi Stadium",
    "round": "R16",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-07-05T01:00:00.000Z",
    "home": "W75",
    "away": "W77",
    "venue": "MetLife Stadium",
    "round": "R16",
    "city": "New York"
  },
  {
    "kickoff_at": "2026-07-05T22:00:00.000Z",
    "home": "W79",
    "away": "W81",
    "venue": "Lincoln Financial Field",
    "round": "R16",
    "city": "Philadelphia"
  },
  {
    "kickoff_at": "2026-07-06T01:00:00.000Z",
    "home": "W80",
    "away": "W82",
    "venue": "Lumen Field",
    "round": "R16",
    "city": "Seattle"
  },
  {
    "kickoff_at": "2026-07-06T21:00:00.000Z",
    "home": "W83",
    "away": "W84",
    "venue": "AT&T Stadium",
    "round": "R16",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-07-07T01:00:00.000Z",
    "home": "W85",
    "away": "W88",
    "venue": "Mercedes-Benz Stadium",
    "round": "R16",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-07-08T01:00:00.000Z",
    "home": "W86",
    "away": "W87",
    "venue": "Gillette Stadium",
    "round": "R16",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-07-09T22:00:00.000Z",
    "home": "W89",
    "away": "W90",
    "venue": "Gillette Stadium",
    "round": "QF",
    "city": "Boston"
  },
  {
    "kickoff_at": "2026-07-10T23:00:00.000Z",
    "home": "W91",
    "away": "W92",
    "venue": "SoFi Stadium",
    "round": "QF",
    "city": "Los Angeles"
  },
  {
    "kickoff_at": "2026-07-11T20:00:00.000Z",
    "home": "W93",
    "away": "W94",
    "venue": "Hard Rock Stadium",
    "round": "QF",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-07-12T01:00:00.000Z",
    "home": "W95",
    "away": "W96",
    "venue": "GEHA Field at Arrowhead Stadium",
    "round": "QF",
    "city": "Kansas City"
  },
  {
    "kickoff_at": "2026-07-15T00:00:00.000Z",
    "home": "W97",
    "away": "W98",
    "venue": "AT&T Stadium",
    "round": "SF",
    "city": "Dallas"
  },
  {
    "kickoff_at": "2026-07-16T00:00:00.000Z",
    "home": "W99",
    "away": "W100",
    "venue": "Mercedes-Benz Stadium",
    "round": "SF",
    "city": "Atlanta"
  },
  {
    "kickoff_at": "2026-07-18T20:00:00.000Z",
    "home": "L101",
    "away": "L102",
    "venue": "Hard Rock Stadium",
    "round": "3rd",
    "city": "Miami"
  },
  {
    "kickoff_at": "2026-07-19T20:00:00.000Z",
    "home": "W101",
    "away": "W102",
    "venue": "MetLife Stadium",
    "round": "Final",
    "city": "New York"
  }
] as const;

const teamsByName = new Map(WORLD_CUP_TEAMS.flatMap((team) => [
  [team.name_en, team],
  [team.name_fr, team],
]));
const venuesByName = new Map(WORLD_CUP_VENUES.map((venue) => [venue.name, venue]));

function stageFromRound(round: string): MatchListItem["stage"] {
  if (round.startsWith("Grp")) return "group";
  if (round === "R32") return "r32";
  if (round === "R16") return "r16";
  if (round === "QF") return "qf";
  if (round === "SF") return "sf";
  if (round === "3rd") return "third_place";
  return "final";
}

function toTeamSnippet(name: string): MatchListItem["home_team"] {
  const team = teamsByName.get(name);
  if (!team) return null;
  return {
    id: team.fifa_code,
    fifa_code: team.fifa_code,
    iso_code: team.iso_code,
    name_fr: team.name_fr,
    name_en: team.name_en,
    flag_emoji: null,
    logo_url: null,
  };
}

function toVenueSnippet(name: string): MatchListItem["venue"] {
  const venue = venuesByName.get(name);
  if (!venue) return null;
  return {
    id: name,
    name: venue.name,
    city_fr: venue.city_fr,
    city_en: venue.city_en,
  };
}

export function getStaticWorldCupMatches(): MatchListItem[] {
  return WORLD_CUP_MATCH_ROWS.map((row, index) => {
    const home = toTeamSnippet(row.home);
    const away = toTeamSnippet(row.away);
    return {
      id: `wc26-${String(index + 1).padStart(3, "0")}`,
      match_number: index + 1,
      stage: stageFromRound(row.round),
      group_label: row.round.startsWith("Grp") ? row.round.replace("Grp ", "") : null,
      kickoff_at: row.kickoff_at,
      status: "scheduled",
      home_score: null,
      away_score: null,
      home_placeholder: home ? null : row.home,
      away_placeholder: away ? null : row.away,
      home_team: home,
      away_team: away,
      venue: toVenueSnippet(row.venue),
    };
  });
}

export function getStaticWorldCupMatchById(id: string): MatchListItem | null {
  return getStaticWorldCupMatches().find((match) => match.id === id) ?? null;
}

export function getTeamByCode(code: string): WorldCupTeam | null {
  return WORLD_CUP_TEAMS.find((team) => team.fifa_code === code) ?? null;
}
