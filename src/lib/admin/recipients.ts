import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CHAT_BOT_USER_ID } from "@/lib/chat/constants";
import type { EmailRecipient } from "@/lib/email/resend";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export type Recipient = EmailRecipient & { user_id: string };

/** Map of auth user id → email, paged through the auth admin API. */
async function emailMap(admin: AdminClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

function toRecipient(
  p: { id: string; display_name: string | null; username: string | null },
  emails: Map<string, string>,
): Recipient | null {
  if (p.id === CHAT_BOT_USER_ID) return null;
  const email = emails.get(p.id);
  if (!email) return null;
  return { user_id: p.id, email, name: p.display_name ?? p.username ?? null };
}

/** All active members with an email (bot excluded). */
export async function listAllRecipients(): Promise<Recipient[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const emails = await emailMap(admin);
  const { data: profs } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .is("deleted_at", null);
  return (profs ?? [])
    .map((p) => toRecipient(p, emails))
    .filter((r): r is Recipient => r !== null);
}

/** Recipients for a specific set of user ids (used by the reminder cron). */
export async function listRecipientsByIds(ids: string[]): Promise<Recipient[]> {
  const admin = getSupabaseAdmin();
  if (!admin || ids.length === 0) return [];
  const emails = await emailMap(admin);
  const { data: profs } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids);
  return (profs ?? [])
    .map((p) => toRecipient(p, emails))
    .filter((r): r is Recipient => r !== null);
}

/** Count of active members (for the admin broadcast preview). */
export async function countActiveMembers(): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .neq("id", CHAT_BOT_USER_ID);
  return count ?? 0;
}
