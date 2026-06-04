"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { GLOBAL_CHAT_ID, CHAT_MAX_LEN } from "./constants";

const bodySchema = z.string().trim().max(CHAT_MAX_LEN);

export type PostedChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  reply_to_id: string | null;
  image_url: string | null;
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
  replyToId?: string | null,
  imageUrl?: string | null,
): Promise<ActionResult<PostedChatMessage>> {
  const fr = locale !== "en";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      message: fr ? "Message trop long (280 max)." : "Too long (280 max).",
    };
  }
  // A message must have text or an image.
  if (!parsed.data && !imageUrl) {
    return { ok: false, message: fr ? "Message vide." : "Empty message." };
  }
  // Anti-abuse: an attached image must be a file we host in the chat bucket
  // (prevents storing arbitrary external/hotlinked URLs as "images").
  if (imageUrl) {
    const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/chat-media/`;
    if (!imageUrl.startsWith(allowedPrefix)) {
      return { ok: false, message: fr ? "Image invalide." : "Invalid image." };
    }
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
      reply_to_id: replyToId ?? null,
      image_url: imageUrl ?? null,
    })
    .select("id, user_id, body, created_at, reply_to_id, image_url")
    .single();

  if (error || !data) {
    if (error?.message?.includes("chat_muted")) {
      return {
        ok: false,
        message: fr
          ? "Un admin t'a rendu muet dans le Salon."
          : "An admin has muted you in the Lounge.",
      };
    }
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

/**
 * Mutes / unmutes a member in the salon (admin only — enforced inside the
 * `admin_set_chat_mute` SECURITY DEFINER RPC). A muted member can't post until
 * an admin reactivates them.
 */
export async function setChatMute(
  userId: string,
  muted: boolean,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_set_chat_mute", {
    p_user_id: userId,
    p_muted: muted,
  });
  if (error) {
    if (error.message?.includes("not_authorized")) {
      return { ok: false, message: fr ? "Réservé aux admins." : "Admins only." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Reports a salon message for moderation (any signed-in member). Idempotent —
 * a second report by the same person on the same message is a no-op.
 */
export async function reportChatMessage(
  commentId: string,
  locale: Locale = "fr",
  reason?: string | null,
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("report_chat_message", {
    p_comment_id: commentId,
    p_reason: reason ?? undefined,
  });
  if (error) {
    if (error.message?.includes("not_authenticated")) {
      return { ok: false, message: fr ? "Connexion requise" : "Sign in required" };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Resolves (clears) every open report on a salon message (admin only — enforced
 * inside the `admin_resolve_chat_report` SECURITY DEFINER RPC).
 */
export async function resolveChatReport(
  commentId: string,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_resolve_chat_report", {
    p_comment_id: commentId,
  });
  if (error) {
    if (error.message?.includes("not_authorized")) {
      return { ok: false, message: fr ? "Réservé aux admins." : "Admins only." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Creates a poll in the salon (a global message + a chat_polls row, atomic via
 * the `create_chat_poll` SECURITY DEFINER RPC). Throttle/mute apply.
 */
export async function createChatPoll(
  question: string,
  options: string[],
  locale: Locale = "fr",
): Promise<ActionResult<string>> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const clean = options.map((o) => o.trim()).filter(Boolean);
  if (question.trim().length < 1) {
    return { ok: false, message: fr ? "Question vide." : "Empty question." };
  }
  if (clean.length < 2) {
    return { ok: false, message: fr ? "Ajoute au moins 2 options." : "Add at least 2 options." };
  }
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("create_chat_poll", {
    p_question: question,
    p_options: clean,
  });
  if (error) {
    if (error.message?.includes("chat_muted")) {
      return { ok: false, message: fr ? "Tu es muet dans le Salon." : "You're muted in the Lounge." };
    }
    if (error.message?.includes("chat_rate_limited")) {
      return { ok: false, message: fr ? "Doucement (3 s)." : "Easy (3s)." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, message: data as string };
}

/** Casts / changes the caller's vote on a poll. */
export async function voteChatPoll(
  pollId: string,
  optionIdx: number,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("vote_chat_poll", {
    p_poll_id: pollId,
    p_option_idx: optionIdx,
  });
  if (error) {
    if (error.message?.includes("poll_closed")) {
      return { ok: false, message: fr ? "Sondage clos." : "Poll closed." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/** Sets the salon slow mode (min seconds between messages; admin only). */
export async function setChatSlowmode(
  seconds: number,
  locale: Locale = "fr",
): Promise<ActionResult> {
  const fr = locale !== "en";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: fr ? "Supabase non configuré" : "Supabase not configured" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_set_chat_slowmode", { p_seconds: seconds });
  if (error) {
    if (error.message?.includes("not_authorized")) {
      return { ok: false, message: fr ? "Réservé aux admins." : "Admins only." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
