import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type BroadcastLog = {
  id: string;
  subject: string;
  body: string;
  channels: string[];
  recipient_count: number;
  emailed: number;
  created_at: string;
};

/** Most recent admin broadcasts (newest first). Read via service-role; the
 *  /admin/broadcast page is already admin-gated by the admin layout. */
export async function listBroadcasts(limit = 20): Promise<BroadcastLog[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const { data } = await admin
    .from("broadcasts")
    .select("id, subject, body, channels, recipient_count, emailed, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    subject: r.subject,
    body: r.body,
    channels: r.channels ?? [],
    recipient_count: r.recipient_count ?? 0,
    emailed: r.emailed ?? 0,
    created_at: r.created_at,
  }));
}
