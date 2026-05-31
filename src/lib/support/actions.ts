"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(4000),
});

/** User opens a support ticket. A DB trigger notifies every admin. */
export async function createSupportTicket(input: {
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise" };

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/support");
  return { ok: true };
}

/** Admin marks a ticket resolved (RLS allows admins only). */
export async function resolveSupportTicket(
  ticketId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/support");
  return { ok: true };
}
