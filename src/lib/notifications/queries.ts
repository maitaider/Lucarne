import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function listMyNotifications(limit = 30): Promise<NotificationRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

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
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}
