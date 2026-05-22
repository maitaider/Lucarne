"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PAYMENT_METHODS = [
  "cash",
  "transfer",
  "paypal",
  "revolut",
  "lydia",
  "wise",
  "other",
] as const;

const recordPaymentSchema = z.object({
  user_id: z.string().uuid(),
  amount_cents: z.number().int().min(1).max(1_000_000),
  method: z.enum(PAYMENT_METHODS),
  currency: z.string().length(3).default("CAD"),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
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
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("buy_in_deadline_passed"))
      return { ok: false, message: "La date butoir d'achat est passée." };
    if (msg.includes("amount_too_low"))
      return { ok: false, message: "Montant trop bas pour créditer un jeton." };
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

export async function adjustBalance(input: {
  user_id: string;
  delta_tokens: number;
  reason: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (input.reason.trim().length < 3) {
    return { ok: false, message: "Raison trop courte." };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("adjust_balance", {
    p_user_id: input.user_id,
    p_delta_tokens: input.delta_tokens,
    p_reason: input.reason.trim(),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/profile/wallet");
  return { ok: true };
}

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

const settingsSchema = z.object({
  token_price_cents: z.number().int().min(1).max(100_000).optional(),
  buy_in_deadline: z.string().nullable().optional(),
  prize_distribution: z
    .object({
      shares: z.array(z.number().int().min(0).max(100)).min(1).max(10),
      house_rake_pct: z.number().min(0).max(50).default(0),
      description_fr: z.string().max(200).optional(),
      description_en: z.string().max(200).optional(),
    })
    .optional(),
  contact_info: z.string().max(500).nullable().optional(),
});

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
    p_token_price_cents: parsed.data.token_price_cents,
    p_buy_in_deadline: parsed.data.buy_in_deadline ?? undefined,
    p_prize_distribution: parsed.data.prize_distribution,
    p_contact_info: parsed.data.contact_info ?? undefined,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/how-it-works");
  return { ok: true };
}

export { PAYMENT_METHODS };

const markPaymentSchema = z.object({
  bet_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  payment_method: z.string().min(1).max(50),
  payment_reference: z.string().max(200).optional(),
});

export async function markPaymentReceived(
  input: z.infer<typeof markPaymentSchema>,
): Promise<{ ok: boolean; message?: string }> {
  const parsed = markPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase not configured" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc(
    "admin_mark_payment_received" as never,
    {
      p_bet_id: parsed.data.bet_id,
      p_amount_cents: parsed.data.amount_cents,
      p_payment_method: parsed.data.payment_method,
      p_payment_reference: parsed.data.payment_reference ?? null,
    } as never,
  );

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/validations");
  return { ok: true };
}

export async function validateBet(betId: string): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_validate_bet" as never, {
    p_bet_id: betId,
  } as never);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/validations");
  return { ok: true };
}

export async function rejectBet(
  betId: string,
  reason: string,
): Promise<{ ok: boolean; message?: string }> {
  if (reason.trim().length < 10) {
    return { ok: false, message: "Raison trop courte (min 10 caractères)" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase not configured" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_reject_bet" as never, {
    p_bet_id: betId,
    p_reason: reason,
  } as never);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/validations");
  return { ok: true };
}
