/**
 * Database types for Supabase client.
 *
 * Until a real migration is applied locally, we hand-write the minimal
 * schema definitions used by the app. After `supabase start` + `db reset`:
 *
 *   pnpm db:types > src/lib/supabase/types.generated.ts
 *
 * Then update this file to re-export from types.generated.ts.
 */

type Team = {
  id: string;
  fifa_code: string;
  name_fr: string;
  name_en: string;
  iso_code: string | null;
  flag_emoji: string | null;
  logo_url: string | null;
  confederation: string;
};

type Match = {
  id: string;
  match_number: number;
  stage: string;
  group_label: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue_id: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

type Venue = {
  id: string;
  name: string;
  city_fr: string;
  city_en: string;
  country: string;
};

type Bet = {
  id: string;
  user_id: string;
  league_id: string | null;
  match_id: string | null;
  bet_type: string;
  payload: unknown;
  stake_cents: number;
  status: string;
  result: string | null;
  payout_cents: number;
  points: number;
  submitted_at: string;
};

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  role: string;
  balance_cents: number;
};

type League = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  visibility: string;
  member_limit: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      leagues: { Row: League; Insert: Partial<League>; Update: Partial<League> };
      bets: { Row: Bet; Insert: Partial<Bet>; Update: Partial<Bet> };
    };
    Views: Record<string, never>;
    // RPC types intentionally loose. After `pnpm db:types`, this regenerates
    // with precise signatures. We use small helper wrappers (see callRpc.ts)
    // for type-safety at call sites.
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  ref: {
    Tables: {
      teams: { Row: Team; Insert: Partial<Team>; Update: Partial<Team> };
      matches: { Row: Match; Insert: Partial<Match>; Update: Partial<Match> };
      venues: { Row: Venue; Insert: Partial<Venue>; Update: Partial<Venue> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
