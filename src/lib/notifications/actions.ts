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

/** Sets the caller's muted notification types (the ones they don't want). */
export async function setNotificationMutes(
  mutedTypes: string[],
): Promise<{ ok: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false };
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const clean = [...new Set(mutedTypes.filter((t) => typeof t === "string"))];
  const { error } = await supabase
    .from("notification_prefs")
    .upsert(
      { user_id: user.id, muted_types: clean, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}
