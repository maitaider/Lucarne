"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { callPlaceBet } from "@/lib/supabase/rpc";
import { placeBetFormSchema, type PlaceBetForm } from "./types";
import { revalidatePath } from "next/cache";

export type PlaceBetResult =
  | { ok: true; betId: string }
  | { ok: false; error: PlaceBetError; message: string };

export type PlaceBetError =
  | "not_authenticated"
  | "invalid_input"
  | "supabase_not_configured"
  | "rpc_error"
  | "kickoff_too_close"
  | "match_not_found"
  | "invalid_stake"
  | "not_a_league_member"
  | "unknown";

/**
 * Server action: place a bet via the `place_bet` RPC.
 *
 * Guarantees enforced server-side:
 *   - Authentication
 *   - Input validation (Zod)
 *   - 60s kickoff buffer (in RPC)
 *   - Idempotency via client_request_id
 *   - Stake bounds [10, 100_000] cents
 */
export async function placeBet(input: PlaceBetForm): Promise<PlaceBetResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      ok: false,
      error: "supabase_not_configured",
      message: "Supabase n'est pas configuré localement.",
    };
  }

  const parsed = placeBetFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Entrée invalide.",
    };
  }

  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "not_authenticated", message: "Connexion requise." };
  }

  const { data, error } = await callPlaceBet(supabase, {
    p_league_id: parsed.data.league_id,
    p_match_id: parsed.data.bet.match_id,
    p_bet_type: parsed.data.bet.bet_type,
    p_payload: parsed.data.bet.payload,
    p_stake_cents: parsed.data.stake_cents,
    p_client_request_id: parsed.data.client_request_id,
  });

  if (error) {
    // Map Postgres exceptions to typed errors
    const msg = error.message.toLowerCase();
    if (msg.includes("kickoff_too_close"))
      return { ok: false, error: "kickoff_too_close", message: "Trop tard — coup d'envoi dans moins de 60s." };
    if (msg.includes("match_not_found"))
      return { ok: false, error: "match_not_found", message: "Match introuvable." };
    if (msg.includes("invalid_stake"))
      return { ok: false, error: "invalid_stake", message: "Mise invalide." };
    if (msg.includes("not_a_league_member"))
      return { ok: false, error: "not_a_league_member", message: "Vous n'êtes pas membre de cette ligue." };
    return { ok: false, error: "rpc_error", message: error.message };
  }

  if (!data) {
    return { ok: false, error: "unknown", message: "Pari non créé." };
  }

  revalidatePath("/bets");
  revalidatePath(`/matches/${parsed.data.bet.match_id}`);

  return { ok: true, betId: data as string };
}
