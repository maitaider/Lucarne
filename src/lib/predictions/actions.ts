"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const uuid = z.string().uuid();
const upsertSchema = z.object({
  /** Group_label → exactly 4 distinct team uuids in ranking order. */
  group_standings: z.record(z.string().min(1).max(2), z.array(uuid).length(4)),
  /** match_number-as-string → predicted winner team uuid. */
  knockout_winners: z.record(z.string().regex(/^\d+$/), uuid),
  champion_team_id: uuid.nullable(),
  top_scorer_player_id: uuid.nullable().optional(),
  /** "<matchNumber>-home"|"-away" → 3rd-placed team uuid (repêchage). */
  third_place_assignments: z.record(z.string(), uuid).optional(),
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
    p_third_place_assignments: parsed.data.third_place_assignments ?? {},
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
  third_place_assignments: z.record(z.string(), uuid).optional(),
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
  let thirdAssign = { ...(parsed.data.third_place_assignments ?? {}) };

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
    thirdAssign = {};
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
        delete thirdAssign[`${n}-home`];
        delete thirdAssign[`${n}-away`];
      }
    }
  }

  return upsertTournamentPrediction({
    group_standings: groups,
    knockout_winners: knockouts,
    champion_team_id: null,
    third_place_assignments: thirdAssign,
  });
}

export type ClearPredictionsResult =
  | { ok: true; deleted: number }
  | { ok: false; message: string };

/**
 * Wipe the caller's per-match SCORE predictions (the `bets`) for every match
 * still OPEN for editing (status `scheduled` AND > 1 h before kickoff).
 *
 * In the score-only model the per-match scores ARE the prediction (they also
 * drive the group standings), so "Tout effacer mon pronostic" must clear them
 * too — resetting only the bracket left every score (and the standings derived
 * from it) in place, which read as "the button does nothing".
 *
 * Locked / live / finished matches are left untouched: you can't un-predict a
 * started match or erase points already scored. RLS gives `authenticated` no
 * DELETE on `bets`, so this uses the service-role client and enforces both
 * ownership (user_id) and the kickoff lock here.
 */
export async function clearMyMatchPredictions(): Promise<ClearPredictionsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré." };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Connexion requise." };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service indisponible." };

  // Matches still open for editing — same 1 h buffer as placing a bet.
  const cutoff = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: openMatches, error: mErr } = await admin
    .schema("ref")
    .from("matches")
    .select("id")
    .eq("status", "scheduled")
    .gt("kickoff_at", cutoff);
  if (mErr) return { ok: false, message: mErr.message };

  const ids = (openMatches ?? []).map((m) => m.id);
  if (ids.length === 0) return { ok: true, deleted: 0 };

  const { data: deleted, error: dErr } = await admin
    .from("bets")
    .delete()
    .eq("user_id", user.id)
    .not("match_id", "is", null)
    .in("match_id", ids)
    .select("id");
  if (dErr) return { ok: false, message: dErr.message };

  revalidatePath("/predict");
  revalidatePath("/bets");
  revalidatePath("/dashboard");
  return { ok: true, deleted: deleted?.length ?? 0 };
}
