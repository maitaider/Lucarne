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

const replySchema = z.object({
  ticketId: z.string().uuid(),
  note: z.string().trim().min(1).max(4000),
  resolve: z.boolean().default(true),
});

/**
 * Admin replies to a support ticket: saves the note, optionally resolves, and
 * notifies the player. The SECURITY DEFINER RPC handles the admin check + the
 * cross-user notification insert.
 */
export async function replySupportTicket(input: {
  ticketId: string;
  note: string;
  resolve?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_reply_ticket", {
    p_ticket_id: parsed.data.ticketId,
    p_note: parsed.data.note,
    p_resolve: parsed.data.resolve,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not_authorized"))
      return { ok: false, error: "Accès admin requis." };
    if (msg.includes("empty_note"))
      return { ok: false, error: "La réponse ne peut pas être vide." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/support");
  return { ok: true };
}
