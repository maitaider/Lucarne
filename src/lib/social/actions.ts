"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReactionKind } from "./constants";

const toggleReactionSchema = z.object({
  target_type: z.enum(["bet", "comment"]),
  target_id: z.string().uuid(),
  reaction: z.enum(["fire", "clap", "laugh", "think", "shock", "skull"]),
});

/**
 * Toggle a reaction on a target (bet or comment).
 * - If user already reacted with this kind → remove (unreact)
 * - Otherwise → insert (react)
 * Returns the new total counts per reaction for the target.
 */
export async function toggleReaction(input: {
  target_type: "bet" | "comment";
  target_id: string;
  reaction: ReactionKind;
}): Promise<
  | { ok: true; reactions: Record<ReactionKind, number>; mine: ReactionKind[] }
  | { ok: false; message: string }
> {
  const parsed = toggleReactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Connexion requise" };

  // Check if reaction already exists for this user
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("target_type", parsed.data.target_type)
    .eq("target_id", parsed.data.target_id)
    .eq("reaction", parsed.data.reaction)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
  } else {
    const { error } = await supabase.from("reactions").insert({
      user_id: user.id,
      target_type: parsed.data.target_type,
      target_id: parsed.data.target_id,
      reaction: parsed.data.reaction,
    });
    if (error) return { ok: false, message: error.message };
  }

  // Re-aggregate counts for return + invalidate UI
  const counts = await aggregateReactions(
    parsed.data.target_type,
    parsed.data.target_id,
    user.id,
  );

  revalidatePath("/bets");
  revalidatePath("/leagues", "layout");
  revalidatePath(`/matches`, "layout");

  return { ok: true, ...counts };
}

async function aggregateReactions(
  targetType: "bet" | "comment",
  targetId: string,
  currentUserId: string,
): Promise<{ reactions: Record<ReactionKind, number>; mine: ReactionKind[] }> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("reactions")
    .select("reaction, user_id")
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  const counts: Record<ReactionKind, number> = {
    fire: 0,
    clap: 0,
    laugh: 0,
    think: 0,
    shock: 0,
    skull: 0,
  };
  const mine: ReactionKind[] = [];
  for (const row of data ?? []) {
    const r = row.reaction as ReactionKind;
    if (counts[r] !== undefined) counts[r] += 1;
    if (row.user_id === currentUserId) mine.push(r);
  }
  return { reactions: counts, mine };
}

const addCommentSchema = z.object({
  parent_type: z.enum(["match", "bet", "league_feed"]),
  parent_id: z.string().uuid(),
  body: z.string().trim().min(1).max(280),
});

export async function addComment(input: {
  parent_type: "match" | "bet" | "league_feed";
  parent_id: string;
  body: string;
}): Promise<{ ok: true; commentId: string } | { ok: false; message: string }> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Connexion requise" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      parent_type: parsed.data.parent_type,
      parent_id: parsed.data.parent_id,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Échec" };
  }

  if (parsed.data.parent_type === "match") {
    revalidatePath(`/matches/${parsed.data.parent_id}`);
  } else if (parsed.data.parent_type === "league_feed") {
    revalidatePath("/leagues", "layout");
  } else {
    revalidatePath("/bets");
  }

  return { ok: true, commentId: data.id };
}

export async function deleteComment(
  commentId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Connexion requise" };

  // Soft-delete by setting deleted_at; RLS ensures only owner can update
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
