"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const scorerSchema = z.object({
  player_name: z.string().trim().min(1).max(80),
  team_id: z.string().uuid().nullable().optional(),
  minute: z.number().int().min(0).max(130).nullable().optional(),
  event_type: z
    .enum(["goal", "penalty_goal", "own_goal"])
    .default("goal"),
});

const resultSchema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(99).nullable(),
  awayScore: z.number().int().min(0).max(99).nullable(),
  status: z.enum(["scheduled", "live", "finished", "postponed", "cancelled"]),
  scorers: z.array(scorerSchema).max(40).default([]),
});

export type SetMatchResultInput = z.input<typeof resultSchema>;

/**
 * Admin-only: set a match's score, status and scorers. Calls the SECURITY
 * DEFINER RPC (which re-checks is_admin server-side). Setting status to
 * 'finished' triggers automatic bet settlement, so results reach every
 * player's dashboard and the leaderboard.
 */
export async function setMatchResultAction(
  input: SetMatchResultInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const { matchId, homeScore, awayScore, status, scorers } = parsed.data;

  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_set_match_result", {
    p_match_id: matchId,
    p_home_score: homeScore ?? undefined,
    p_away_score: awayScore ?? undefined,
    p_status: status,
    p_scorers: scorers,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath("/dashboard");
  revalidatePath("/live");
  revalidatePath("/matches");
  return { ok: true };
}
