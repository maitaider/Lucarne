"use server";

import { randomBytes } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser, isAdminRole } from "@/lib/profile/queries";
import { getAppSettings } from "./economy";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PAYMENT_METHODS } from "./constants";

const recordPaymentSchema = z.object({
  user_id: z.string().uuid(),
  amount_cents: z.number().int().min(1).max(1_000_000),
  method: z.enum(PAYMENT_METHODS),
  currency: z.string().length(3).default("CAD"),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  // I-5: explicit override to record a 2nd access payment for a player who
  // already has one (the RPC otherwise raises `already_has_access`).
  allow_duplicate: z.boolean().optional().default(false),
});

export async function recordPayment(
  input: z.infer<typeof recordPaymentSchema>,
): Promise<{ ok: true; payment_id: string } | { ok: false; message: string }> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("record_payment", {
    p_user_id: parsed.data.user_id,
    p_amount_cents: parsed.data.amount_cents,
    p_method: parsed.data.method,
    p_currency: parsed.data.currency,
    p_reference: parsed.data.reference,
    p_note: parsed.data.note,
    p_allow_duplicate: parsed.data.allow_duplicate,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already_has_access"))
      return {
        ok: false,
        message:
          "Ce joueur a déjà un accès payé. Coche « Forcer un 2ᵉ paiement » pour l'enregistrer quand même.",
      };
    if (msg.includes("buy_in_deadline_passed"))
      return { ok: false, message: "La date butoir d'achat est passée." };
    if (msg.includes("amount_too_low"))
      return { ok: false, message: "Le montant doit être supérieur à 0." };
    if (msg.includes("forbidden"))
      return { ok: false, message: "Accès admin requis." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/profile/wallet");
  return { ok: true, payment_id: data as string };
}

export async function refundPayment(input: {
  payment_id: string;
  reason?: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("refund_payment", {
    p_payment_id: input.payment_id,
    p_reason: input.reason,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Permanently delete a payment row (correct a mistake, clear test money, or a
 * payment refunded in cash outside the app). Removing a confirmed payment
 * revokes that player's access. Admin-only (RPC re-checks the role).
 */
export async function deletePayment(input: {
  payment_id: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_delete_payment", {
    p_payment_id: input.payment_id,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("payment_not_found"))
      return { ok: false, message: "Paiement introuvable." };
    if (m.includes("forbidden"))
      return { ok: false, message: "Accès admin requis." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/profile/wallet");
  return { ok: true };
}

// adjustBalance removed 2026-06-01: the game is free and scored in points —
// there are no gameplay jetons/balance to adjust (residual debt). The admin
// "Solde" column + balance editor are gone. The `adjust_balance` RPC stays in
// the DB as dead residual (no migration to drop it yet).

export async function setUserRole(input: {
  user_id: string;
  new_role: "player" | "admin" | "super_admin";
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: input.user_id,
    p_new_role: input.new_role,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// -----------------------------------------------------------------------------
// User lifecycle — create / archive / restore / purge
// (RPCs are SECURITY DEFINER with their own role guards; we call them through the
// admin's AUTHENTICATED client so auth.uid() resolves. Creating an auth account
// is the one step that needs the service-role client.)
// -----------------------------------------------------------------------------

/** Map raw RPC error messages to friendly, localized-ish text. */
function mapUserMgmtError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("forbidden") || m.includes("only_super_admin"))
    return "Action non autorisée (super admin requis).";
  if (m.includes("cannot_archive_self") || m.includes("cannot_purge_self"))
    return "Tu ne peux pas faire ça sur ton propre compte.";
  if (m.includes("cannot_remove_last_super_admin"))
    return "Impossible : c'est le dernier super admin.";
  if (m.includes("cannot_purge_has_history"))
    return "Suppression définitive impossible : ce compte a des paiements ou possède une ligue. Archive-le plutôt.";
  if (m.includes("user_not_found")) return "Joueur introuvable.";
  return raw;
}

const createUserSchema = z.object({
  email: z.string().email().max(160),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "username_invalid")
    .min(3)
    .max(24),
  display_name: z.string().trim().max(40).optional(),
  password: z.string().min(8).max(72).optional(),
  role: z.enum(["player", "admin", "super_admin"]).default("player"),
  mark_paid: z.boolean().default(false),
});

export type CreateUserResult =
  | {
      ok: true;
      email: string;
      username: string;
      password: string;
      access_granted: boolean;
    }
  | { ok: false; message: string };

/** Readable, unambiguous temp password (no 0/O/1/l/I). */
function generatePassword(): string {
  const alphabet =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(14);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function createUser(
  input: z.infer<typeof createUserSchema>,
): Promise<CreateUserResult> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg =
      issue?.message === "username_invalid"
        ? "Nom d'utilisateur invalide (lettres, chiffres, - et _ uniquement)."
        : (issue?.message ?? "Entrée invalide.");
    return { ok: false, message: msg };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, message: "Service-role Supabase non configuré." };
  }

  // Authorize against the caller's own session.
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) {
    return { ok: false, message: "Accès admin requis." };
  }
  if (parsed.data.role !== "player" && me.role !== "super_admin") {
    return { ok: false, message: "Seul un super admin peut créer un admin." };
  }

  const supabase = await getSupabaseServer();

  // Pre-check username availability for a clean error (the trigger would
  // otherwise fail the whole createUser with a raw unique_violation).
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (taken) {
    return { ok: false, message: "Ce nom d'utilisateur est déjà pris." };
  }

  const password = parsed.data.password ?? generatePassword();

  // Create the auth account. handle_new_user() creates the profile from the
  // metadata; email is auto-confirmed (project has confirmations disabled).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: {
      username: parsed.data.username,
      display_name: parsed.data.display_name ?? null,
      locale: me.locale,
    },
  });
  if (createErr || !created?.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("registered") || m.includes("already"))
      return { ok: false, message: "Un compte existe déjà avec cet email." };
    if (m.includes("password"))
      return { ok: false, message: "Mot de passe trop faible (8 caractères min)." };
    return {
      ok: false,
      message: createErr?.message ?? "Création du compte échouée.",
    };
  }
  const newId = created.user.id;

  // Set role + auto-join the house league + audit (auth-checked RPC as the admin).
  const { error: finErr } = await supabase.rpc("admin_finalize_new_user", {
    p_user_id: newId,
    p_role: parsed.data.role,
  });
  if (finErr) {
    revalidatePath("/admin", "layout");
    return {
      ok: false,
      message: `Compte créé, mais finalisation partielle : ${finErr.message}`,
    };
  }

  // Optionally grant access by recording a manual seat payment (0 jetons, like
  // every access payment — see record_payment / unify_payment_rails).
  let accessGranted = false;
  if (parsed.data.mark_paid) {
    const settings = await getAppSettings();
    const { error: payErr } = await supabase.rpc("record_payment", {
      p_user_id: newId,
      p_amount_cents: settings.buy_in_amount_cents,
      p_method: "cash",
      p_currency: settings.currency,
      p_reference: undefined,
      p_note: "Accès accordé à la création (admin)",
    });
    accessGranted = !payErr;
  }

  revalidatePath("/admin", "layout");
  return {
    ok: true,
    email: parsed.data.email,
    username: parsed.data.username,
    password,
    access_granted: accessGranted,
  };
}

export async function archiveUser(input: {
  user_id: string;
  reason?: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_archive_user", {
    p_user_id: input.user_id,
    p_reason: input.reason?.trim() || undefined,
  });
  if (error) return { ok: false, message: mapUserMgmtError(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function restoreUser(input: {
  user_id: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_restore_user", {
    p_user_id: input.user_id,
  });
  if (error) return { ok: false, message: mapUserMgmtError(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function purgeUser(input: {
  user_id: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_purge_user", {
    p_user_id: input.user_id,
  });
  if (error) return { ok: false, message: mapUserMgmtError(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const settingsSchema = z.object({
  buy_in_amount_cents: z.number().int().min(100).max(1_000_000).optional(),
  currency: z.string().length(3).optional(),
  buy_in_deadline: z.string().nullable().optional(),
  tournament_start_at: z.string().nullable().optional(),
  tournament_end_at: z.string().nullable().optional(),
  prize_distribution: z
    .object({
      shares: z.array(z.number().int().min(0).max(100)).min(1).max(10),
      house_rake_pct: z.number().min(0).max(50).default(0),
      description_fr: z.string().max(200).optional(),
      description_en: z.string().max(200).optional(),
    })
    .optional(),
  contact_label: z.string().max(120).nullable().optional(),
  contact_info: z.string().max(500).nullable().optional(),
});

/**
 * Admin toggle: accept new players after the global lock (late entry). When on,
 * unpaid users see "Buy your seat" again; paying late grants a 1 h window
 * (handled by my_prediction_deadline() / getMyBuyInStatus).
 */
export async function setLateEntryOpen(
  open: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) {
    return { ok: false, message: "Accès refusé" };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service indisponible" };
  const { error } = await admin
    .from("app_settings")
    .update({ late_entry_open: open })
    .eq("id", 1);
  if (error) return { ok: false, message: error.message };
  // can_buy_in is read across the app — revalidate broadly.
  revalidatePath("/admin/economy");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Admin per-user unlock: grant a paid player a fresh prediction window for the
 * REMAINING matches (sets profiles.predictions_unlock_until = now + hours; the
 * per-match kickoff lock still blocks already-started matches). Pass hours=0 to
 * re-lock immediately.
 */
export async function setUserPredictionUnlock(
  userId: string,
  hours: number,
): Promise<{ ok: boolean; message?: string }> {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) {
    return { ok: false, message: "Accès refusé" };
  }
  if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
    return { ok: false, message: "Durée invalide" };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service indisponible" };
  const until =
    hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
  const { error } = await admin
    .from("profiles")
    .update({ predictions_unlock_until: until })
    .eq("id", userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/users");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAppSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (parsed.data.prize_distribution) {
    const sum =
      parsed.data.prize_distribution.shares.reduce((a, b) => a + b, 0) +
      (parsed.data.prize_distribution.house_rake_pct ?? 0);
    if (sum !== 100) {
      return {
        ok: false,
        message: `Les parts + commission (${sum}%) doivent totaliser 100%.`,
      };
    }
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("update_app_settings", {
    p_buy_in_amount_cents: parsed.data.buy_in_amount_cents,
    p_currency: parsed.data.currency,
    p_buy_in_deadline: parsed.data.buy_in_deadline ?? undefined,
    p_tournament_start_at: parsed.data.tournament_start_at ?? undefined,
    p_tournament_end_at: parsed.data.tournament_end_at ?? undefined,
    p_prize_distribution: parsed.data.prize_distribution,
    p_contact_label: parsed.data.contact_label ?? undefined,
    p_contact_info: parsed.data.contact_info ?? undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/how-it-works");
  revalidatePath("/", "layout");
  return { ok: true };
}

const scoringSchema = z.object({
  match_winner: z.number().int().min(0).max(100),
  total_goals_exact: z.number().int().min(0).max(100),
  total_goals_close: z.number().int().min(0).max(100),
  exact_score: z.number().int().min(0).max(100),
});

/**
 * Admin: edit the points barème (`app_settings.scoring_rules`). Merges into the
 * existing JSON so unrelated keys are preserved. Read LIVE by compute_bet_points,
 * so it applies to future scoring immediately — call `recomputeAllScores()` to
 * also re-apply it to already-played matches.
 */
export async function updateScoringRules(
  input: z.infer<typeof scoringSchema>,
): Promise<{ ok: boolean; message?: string }> {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) return { ok: false, message: "Accès refusé" };
  const parsed = scoringSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "Service indisponible" };
  const { data: cur } = await admin
    .from("app_settings")
    .select("scoring_rules")
    .eq("id", 1)
    .single();
  const merged = {
    ...((cur?.scoring_rules as Record<string, number> | null) ?? {}),
    ...parsed.data,
  };
  const { error } = await admin
    .from("app_settings")
    .update({ scoring_rules: merged })
    .eq("id", 1);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/scoring");
  revalidatePath("/how-it-works");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Admin: re-score every settled score-pick on a finished match with the CURRENT
 * barème (`admin_rescore_all_matches` RPC). Silent — keeps status=settled so no
 * notifications are re-emitted. Returns the number of bets re-scored.
 */
export async function recomputeAllScores(): Promise<{
  ok: boolean;
  message?: string;
  count?: number;
}> {
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) return { ok: false, message: "Accès refusé" };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("admin_rescore_all_matches");
  if (error) {
    if (error.message?.includes("not_authorized")) {
      return { ok: false, message: "Réservé aux admins." };
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: true, count: typeof data === "number" ? data : undefined };
}

// Admin bet validation flow removed 2026-05-24: bets land directly as
// `validated` (see migration 20260524000000). The /admin/validations page
// and its server actions are gone — Stripe payments unlock betting now.
