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
 * Best-effort: email the members a salon message concerns — the author it
 * REPLIES to, and the people it @mentions. Mirrors the `notify_comment` trigger
 * (reply target first, then mentions, deduped, never the sender) so the email
 * channel matches the in-app notifications exactly. No-op when email isn't
 * configured (`RESEND_API_KEY` absent) or nothing resolves. Designed to run
 * inside `after()` so it never delays the message post.
 */
export async function notifyChatMessageByEmail(opts: {
  body: string;
  senderId: string;
  replyToId?: string | null;
  locale: Locale;
}): Promise<void> {
  if (!emailEnabled()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  // Reply target = author of the cited message (never the sender).
  let replyTargetId: string | null = null;
  if (opts.replyToId) {
    const { data: cited } = await admin
      .from("comments")
      .select("user_id")
      .eq("id", opts.replyToId)
      .single();
    if (cited && cited.user_id !== opts.senderId) replyTargetId = cited.user_id;
  }

  // @mention recipients (active members, username is citext → case-insensitive),
  // excluding the sender AND the reply target (who gets the reply email).
  const handles = [
    ...new Set(
      [...opts.body.matchAll(MENTION_RE)].map((m) => m[1].toLowerCase()),
    ),
  ];
  let mentionIds: string[] = [];
  if (handles.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id")
      .in("username", handles)
      .is("deleted_at", null);
    mentionIds = (profs ?? [])
      .map((p) => p.id)
      .filter((id) => id !== opts.senderId && id !== replyTargetId);
  }

  if (!replyTargetId && mentionIds.length === 0) return;

  const { data: actor } = await admin
    .from("profiles")
    .select("username, display_name")
    .eq("id", opts.senderId)
    .single();
  const fr = opts.locale !== "en";
  const actorName =
    actor?.display_name || actor?.username || (fr ? "Quelqu'un" : "Someone");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lucarne.ca";
  const ctaUrl = `${appUrl}/${opts.locale}/chat`;
  const ctaLabel = fr ? "Ouvrir le Salon" : "Open the Lounge";
  const trimmed = opts.body.trim();
  const preview = trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;

  // Reply email to the cited author.
  if (replyTargetId) {
    const recipients = await listRecipientsByIds([replyTargetId]);
    if (recipients.length > 0) {
      await sendBroadcastEmail({
        recipients,
        subject: fr
          ? `${actorName} t'a répondu dans le Salon`
          : `${actorName} replied to you in the Lounge`,
        heading: fr ? "On t'a répondu dans le Salon" : "You got a reply",
        body: fr
          ? `${actorName} a répondu à ton message :\n\n« ${preview} »`
          : `${actorName} replied to your message:\n\n"${preview}"`,
        ctaLabel,
        ctaUrl,
      });
    }
  }

  // Mention emails (the others).
  if (mentionIds.length > 0) {
    const recipients = await listRecipientsByIds(mentionIds);
    if (recipients.length > 0) {
      await sendBroadcastEmail({
        recipients,
        subject: fr
          ? `${actorName} t'a mentionné dans le Salon`
          : `${actorName} mentioned you in the Lounge`,
        heading: fr ? "Tu as été mentionné dans le Salon" : "You were mentioned",
        body: fr
          ? `${actorName} t'a mentionné dans le Salon :\n\n« ${preview} »`
          : `${actorName} mentioned you in the Lounge:\n\n"${preview}"`,
        ctaLabel,
        ctaUrl,
      });
    }
  }
}
