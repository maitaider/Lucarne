"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

/** Set (or clear) the current user's avatar URL. */
export async function updateAvatarUrlAction(
  url: string | null,
): Promise<Result> {
  const parsed = z.string().url().max(2048).nullable().safeParse(url);
  if (!parsed.success) return { ok: false, error: "URL invalide" };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Update the current user's display name (shown in the header + greeting). */
export async function updateDisplayNameAction(name: string): Promise<Result> {
  const parsed = z.string().trim().min(1).max(40).safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: "Le nom doit faire 1 à 40 caractères." };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
