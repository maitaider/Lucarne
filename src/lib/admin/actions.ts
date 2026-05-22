"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
