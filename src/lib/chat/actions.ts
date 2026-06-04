"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { GLOBAL_CHAT_ID, CHAT_MAX_LEN } from "./constants";

const bodySchema = z.string().trim().min(1).max(CHAT_MAX_LEN);

export type PostedChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; message: T })
  | { ok: false; message: string };

/**
 * Posts a message to the global salon. The message is a `public.comments` row
 * (parent_type='global'); @mention notifications + the 1 msg / 3 s throttle are
 * enforced by DB triggers. Returns the inserted row so the sender can render it
 * instantly (deduped against the realtime echo by id).
 */
export async function postChatMessage(
  body: string,
  locale: Locale = "fr",
): Promise<ActionResult<PostedChatMessage>> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      message: fr ? "Message vide ou trop long (280 max)." : "Empty or too long (280 max).",
    };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: fr ? "Connexion requise" : "Sign in required" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: user.id,
      parent_type: "global",
      parent_id: GLOBAL_CHAT_ID,
      body: parsed.data,
    })
    .select("id, user_id, body, created_at")
    .single();

  if (error || !data) {
    if (error?.message?.includes("chat_rate_limited")) {
      return {
        ok: false,
        message: fr
          ? "Doucement — un message toutes les 3 secondes."
          : "Easy — one message every 3 seconds.",
      };
    }
    return { ok: false, message: error?.message ?? (fr ? "Échec de l'envoi." : "Send failed.") };
  }
  return { ok: true, message: data };
}

/**
 * Soft-deletes a salon message. Uses the `delete_comment` SECURITY DEFINER RPC,
 * which verifies author-or-admin server-side (a direct UPDATE is refused by RLS).
 */
export async function deleteChatMessage(
  commentId: string,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: fr ? "Connexion requise" : "Sign in required" };

  const { error } = await supabase.rpc("delete_comment", { p_comment_id: commentId });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Pins / unpins a salon message (admin only — enforced inside the
 * `admin_set_comment_pin` SECURITY DEFINER RPC).
 */
export async function setChatPin(
  commentId: string,
  pinned: boolean,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_set_comment_pin", {
    p_comment_id: commentId,
    p_pinned: pinned,
  });
  if (error) {
    if (error.message?.includes("not_authorized")) {
      return { ok: false, message: fr ? "Réservé aux admins." : "Admins only." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
