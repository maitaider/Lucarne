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
        message: "Scénario verrouillé — le tournoi a commencé.",
      };
    return { ok: false, error: "rpc", message: error.message };
  }

  revalidatePath("/bracket");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Wipe part (or all) of the user's prediction. Scope:
 *   - "all": clear groups + knockouts + champion
 *   - "groups": clear group standings (also clears knockouts since R32 depends on groups)
 *   - "r32" | "r16" | "qf" | "sf" | "third_place" | "final": clear that stage's picks
 *     AND any downstream picks (since downstream depends on upstream).
 *
 * The actual list of match_numbers per stage is computed client-side from the
 * schedule and passed in as `match_numbers` for portability.
 */
const resetSchema = z.object({
  scope: z.enum([
    "all",
    "groups",
    "r32",
    "r16",
    "qf",
    "sf",
    "third_place",
    "final",
  ]),
  /** Existing prediction state to mutate; sent back atomically. */
  group_standings: z.record(z.string(), z.array(uuid).length(4)),
  knockout_winners: z.record(z.string(), uuid),
  /** Match numbers per stage, indexed by stage key. Provided by the client. */
  stage_match_numbers: z.record(z.string(), z.array(z.number().int())),
});

export async function resetTournamentPrediction(
  input: z.infer<typeof resetSchema>,
): Promise<UpsertPredictionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  let groups = { ...parsed.data.group_standings };
  let knockouts = { ...parsed.data.knockout_winners };

  const STAGE_ORDER: Array<keyof typeof input.stage_match_numbers> = [
    "r32",
    "r16",
    "qf",
    "sf",
    "third_place",
    "final",
  ];

  if (parsed.data.scope === "all" || parsed.data.scope === "groups") {
    groups = {};
    knockouts = {};
  } else {
    // Clear this stage AND everything downstream.
    const idx = STAGE_ORDER.indexOf(parsed.data.scope);
    if (idx < 0) {
      return { ok: false, error: "invalid", message: "Stage inconnu." };
    }
    const toClear = STAGE_ORDER.slice(idx);
    for (const stage of toClear) {
      const nums = parsed.data.stage_match_numbers[stage] ?? [];
      for (const n of nums) {
        delete knockouts[String(n)];
      }
    }
  }

  return upsertTournamentPrediction({
    group_standings: groups,
    knockout_winners: knockouts,
    champion_team_id: null,
  });
}
