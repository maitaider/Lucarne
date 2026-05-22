/**
 * Database types for Supabase client.
 *
 * Until a real migration is applied locally, we hand-write the minimal RPC
 * signatures used by the app. After `supabase start` + `db reset`, regenerate:
 *
 *   pnpm supabase gen types typescript --local > src/lib/supabase/types.generated.ts
 *
 * Then update this file to re-export from types.generated.ts.
 */

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      redeem_invitation: {
        Args: { p_code: string };
        Returns: { invitation_id: string; league_id: string | null };
      };
      place_bet: {
        Args: {
          p_league_id: string | null;
          p_match_id: string | null;
          p_bet_type: string;
          p_payload: unknown;
          p_stake_cents: number;
          p_client_request_id: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
