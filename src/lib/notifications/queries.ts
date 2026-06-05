import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/** Notification types the caller has muted (hidden from bell + list + count). */
export async function getNotificationMutes(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notification_prefs")
    .select("muted_types")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.muted_types ?? [];
}

export async function listMyNotifications(limit = 30): Promise<NotificationRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const muted = await getNotificationMutes();

  let q = supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", user.id);
  if (muted.length > 0) q = q.not("type", "in", `(${muted.join(",")})`);

  const { data } = await q.order("created_at", { ascending: false }).limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    payload: (r.payload as Record<string, unknown>) ?? {},
    read_at: r.read_at,
    created_at: r.created_at,
  }));
}

export async function countUnreadNotifications(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 0;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const muted = await getNotificationMutes();
  let q = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (muted.length > 0) q = q.not("type", "in", `(${muted.join(",")})`);

  const { count } = await q;
  return count ?? 0;
}
