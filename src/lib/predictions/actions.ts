"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const uuid = z.string().uuid();
const upsertSchema = z.object({
  /** Group_label → exactly 4 distinct team uuids in ranking order. */
  group_standings: z.record(z.string().min(1).max(2), z.array(uuid).length(4)),
  /** match_number-as-string → predicted winner team uuid. */
  knockout_winners: z.record(z.string().regex(/^\d+$/), uuid),
  champion_team_id: uuid.nullable(),
  top_scorer_player_id: uuid.nullable().optional(),
});

export type UpsertPredictionResult =
  | { ok: true }
  | { ok: false; error: "locked" | "auth" | "invalid" | "rpc"; message: string };

export async function upsertTournamentPrediction(
  input: z.infer<typeof upsertSchema>,
): Promise<UpsertPredictionResult> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      ok: false,
      error: "rpc",
      message: "Supabase non configuré.",
    };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "auth", message: "Connexion requise." };
  }

  const { error } = await supabase.rpc("upsert_tournament_prediction", {
    p_group_standings: parsed.data.group_standings,
    p_knockout_winners: parsed.data.knockout_winners,
    p_champion_team_id: parsed.data.champion_team_id,
    p_top_scorer_player_id: parsed.data.top_scorer_player_id ?? null,
  } as never);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("bracket_locked"))
      return {
        ok: false,
        error: "locked",
        message: "Bracket verrouillé — le tournoi a commencé.",
      };
    return { ok: false, error: "rpc", message: error.message };
  }

  revalidatePath("/bracket");
  revalidatePath("/dashboard");
  return { ok: true };
}
