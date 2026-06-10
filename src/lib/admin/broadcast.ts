"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdminRole } from "@/lib/profile/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listAllRecipients } from "./recipients";
import { sendBroadcastEmail } from "@/lib/email/resend";
import { CHAT_BOT_USER_ID, GLOBAL_CHAT_ID } from "@/lib/chat/constants";

const broadcastSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(4000),
  inApp: z.boolean().default(true),
  email: z.boolean().default(false),
  salon: z.boolean().default(true),
});

export type BroadcastResult =
  | {
      ok: true;
      inApp: boolean;
      salon: boolean;
      emailed: number;
      emailSkipped: boolean;
      recipientCount: number;
    }
  | { ok: false; message: string };

/**
 * Admin broadcast: send the same announcement/reminder to every member, in-app
 * and/or by email.
 *
 * - In-app uses the existing `publish_news` RPC (creates an announcement post +
 *   notifies all active profiles).
 * - Email uses Resend (no-op if RESEND_API_KEY is unset → emailSkipped: true).
 */
export async function sendAdminBroadcast(
  input: z.infer<typeof broadcastSchema>,
): Promise<BroadcastResult> {
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const me = await getCurrentUser();
  if (!me || !isAdminRole(me.role)) {
    return { ok: false, message: "Accès refusé" };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, message: "Service indisponible (service-role manquant)" };
  }

  const { subject, message, inApp, email, salon } = parsed.data;
  if (!inApp && !email && !salon) {
    return {
      ok: false,
      message: "Choisis au moins un canal (salon, in-app ou courriel).",
    };
  }

  // Salon: the system bot posts the announcement in the global chat. The bot is
  // allowed up to 4200 chars (vs 280 for players) so the full message shows;
  // non-blocking so it can't sink the other channels.
  let salonPosted = false;
  if (salon) {
    const body = `📣 ${subject}\n${message}`.slice(0, 4200);
    const { error } = await admin.from("comments").insert({
      user_id: CHAT_BOT_USER_ID,
      parent_type: "global",
      parent_id: GLOBAL_CHAT_ID,
      body,
    });
    salonPosted = !error;
    if (error) console.error("[broadcast] salon post failed:", error.message);
  }

  // In-app: announcement post + notification to all active profiles.
  if (inApp) {
    const { error } = await admin.rpc("publish_news", {
      p_title: subject,
      p_body: message,
      p_kind: "announcement",
      p_source: "admin",
    });
    if (error) {
      return { ok: false, message: `Notification in-app : ${error.message}` };
    }
  }

  // Email: one personalized email per member (addresses stay private).
  let emailed = 0;
  let emailSkipped = false;
  let recipientCount = 0;
  if (email) {
    const recipients = await listAllRecipients();
    recipientCount = recipients.length;
    const res = await sendBroadcastEmail({
      recipients,
      subject,
      heading: subject,
      body: message,
      ctaLabel: "Ouvrir Lucarne",
      ctaUrl:
        (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lucarne.ca") + "/dashboard",
    });
    emailed = res.sent;
    emailSkipped = res.skipped;
    if (res.error && res.sent === 0 && !res.skipped) {
      return { ok: false, message: `Courriel : ${res.error}` };
    }
  }

  // Journalise la diffusion (historique admin). Non-bloquant.
  const channels = [
    salon ? "salon" : null,
    inApp ? "in_app" : null,
    email ? "email" : null,
  ].filter((c): c is string => c !== null);
  const { error: logError } = await admin.from("broadcasts").insert({
    subject,
    body: message,
    channels,
    recipient_count: recipientCount,
    emailed,
    sent_by: me.id,
  });
  if (logError) console.error("[broadcast] log insert failed:", logError.message);

  revalidatePath("/admin/broadcast");
  return { ok: true, inApp, salon: salonPosted, emailed, emailSkipped, recipientCount };
}
