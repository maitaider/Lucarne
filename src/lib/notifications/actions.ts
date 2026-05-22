"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(
  id: string,
): Promise<{ ok: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false };
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false };
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}
