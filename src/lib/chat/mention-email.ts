import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listRecipientsByIds } from "@/lib/admin/recipients";
import { emailEnabled, sendBroadcastEmail } from "@/lib/email/resend";
import type { Locale } from "@/i18n/routing";

// Mirror of the `notify_comment()` DB trigger's mention pattern — keep them in
// sync so the email channel targets the exact same members the in-app
// notification does.
const MENTION_RE = /@([A-Za-z0-9_-]{3,24})/g;

/**
 * Best-effort: email everyone @mentioned in a salon message.
 *
 * The in-app notification is already created by the `notify_comment` trigger on
 * insert — this only ADDS the email channel. No-op when email isn't configured
 * (`RESEND_API_KEY` absent), the message has no @handle, or nothing resolves.
 * Resolves handles → active members via the service-role client (username is
 * citext → case-insensitive), excludes the sender, then sends via Resend.
 *
 * Designed to run inside `after()` so it never delays the message post.
 */
export async function notifyMentionsByEmail(opts: {
  body: string;
  senderId: string;
  locale: Locale;
}): Promise<void> {
  if (!emailEnabled()) return;

  const handles = [
    ...new Set(
      [...opts.body.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase()),
    ),
  ];
  if (handles.length === 0) return;

  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data: profs } = await admin
    .from("profiles")
    .select("id")
    .in("username", handles) // citext column → case-insensitive match
    .is("deleted_at", null);
  const ids = (profs ?? [])
    .map((p) => p.id)
    .filter((id) => id !== opts.senderId); // never email yourself
  if (ids.length === 0) return;

  const recipients = await listRecipientsByIds(ids);
  if (recipients.length === 0) return;

  const { data: actor } = await admin
    .from("profiles")
    .select("username, display_name")
    .eq("id", opts.senderId)
    .single();

  const fr = opts.locale !== "en";
  const actorName =
    actor?.display_name || actor?.username || (fr ? "Quelqu'un" : "Someone");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lucarne.ca";
  const trimmed = opts.body.trim();
  const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;

  await sendBroadcastEmail({
    recipients,
    subject: fr
      ? `${actorName} t'a mentionné dans le Salon`
      : `${actorName} mentioned you in the Lounge`,
    heading: fr ? "Tu as été mentionné dans le Salon" : "You were mentioned",
    body: fr
      ? `${actorName} t'a mentionné dans le Salon :\n\n« ${preview} »`
      : `${actorName} mentioned you in the Lounge:\n\n"${preview}"`,
    ctaLabel: fr ? "Ouvrir le Salon" : "Open the Lounge",
    ctaUrl: `${appUrl}/${opts.locale}/chat`,
  });
}
