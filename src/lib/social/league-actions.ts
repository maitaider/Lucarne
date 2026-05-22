"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const publishSchema = z.object({
  league_id: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
  parent_post_id: z.string().uuid().optional(),
  kind: z.enum(["message", "announcement"]).default("message"),
});

export async function publishLeaguePost(input: {
  league_id: string;
  body: string;
  parent_post_id?: string;
  kind?: "message" | "announcement";
}): Promise<{ ok: true; post_id: string } | { ok: false; message: string }> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("publish_league_post", {
    p_league_id: parsed.data.league_id,
    p_body: parsed.data.body,
    p_parent_post_id: parsed.data.parent_post_id,
    p_kind: parsed.data.kind,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not_a_league_member")) {
      return { ok: false, message: "Réservé aux membres de la ligue." };
    }
    if (msg.includes("unauthenticated")) {
      return { ok: false, message: "Connexion requise." };
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/leagues", "layout");
  return { ok: true, post_id: data as string };
}

export async function deleteLeaguePost(
  postId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Connexion requise" };

  const { error } = await supabase
    .from("league_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/leagues", "layout");
  return { ok: true };
}
