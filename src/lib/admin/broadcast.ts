"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listAllRecipients } from "./recipients";
import { sendBroadcastEmail } from "@/lib/email/resend";

const broadcastSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(4000),
  inApp: z.boolean().default(true),
  email: z.boolean().default(false),
});

export type BroadcastResult =
  | {
      ok: true;
      inApp: boolean;
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
  if (!(await isAdmin())) {
    return { ok: false, message: "Accès refusé" };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, message: "Service indisponible (service-role manquant)" };
  }

  const { subject, message, inApp, email } = parsed.data;
  if (!inApp && !email) {
    return { ok: false, message: "Choisis au moins un canal (in-app ou courriel)." };
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

  revalidatePath("/admin/broadcast");
  return { ok: true, inApp, emailed, emailSkipped, recipientCount };
}
