/**
 * Thin typed wrappers around Supabase RPCs.
 *
 * Supabase-js generates RPC type signatures from the Database type. Until
 * we regenerate types via `pnpm db:types`, these wrappers hide the `as never`
 * cast and provide a typed surface to the rest of the app.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function callRedeemInvitation(
  supabase: SupabaseClient,
  args: { p_code: string },
) {
  return (await supabase.rpc("redeem_invitation", args as never)) as {
    data: { invitation_id: string; league_id: string | null } | null;
    error: { message: string; code?: string } | null;
  };
}

export async function callPlaceBet(
  supabase: SupabaseClient,
  args: {
    p_league_id: string | null;
    p_match_id: string | null;
    p_bet_type: string;
    p_payload: unknown;
    p_stake_cents: number;
    p_client_request_id: string;
  },
) {
  return (await supabase.rpc("place_bet", args as never)) as {
    data: string | null;
    error: { message: string; code?: string } | null;
  };
}
