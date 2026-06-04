import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getReactionsForTargets, type ReactionSummary } from "@/lib/social/queries";
import { GLOBAL_CHAT_ID } from "./constants";

export type ChatAuthor = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  pinned_at: string | null;
  author: ChatAuthor;
  reactions: ReactionSummary;
};

/** A salon member, used client-side to resolve realtime authors + @mentions. */
export type ChatMember = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function normalizeAuthor(raw: unknown): ChatAuthor {
  const a = Array.isArray(raw) ? raw[0] : raw;
  const author = (a ?? {}) as Partial<ChatAuthor>;
  return {
    username: author.username ?? "?",
    display_name: author.display_name ?? null,
    avatar_url: author.avatar_url ?? null,
  };
}

/**
 * Returns the latest global-salon messages in chronological order (oldest →
 * newest), each with its author profile and reaction summary. Soft-deleted
 * messages are excluded by the `comments_select_all` RLS policy.
 */
export async function listChatMessages(limit = 80): Promise<ChatMessage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, user_id, body, created_at, pinned_at, author:profiles!comments_user_id_fkey(username, display_name, avatar_url)",
    )
    .eq("parent_type", "global")
    .eq("parent_id", GLOBAL_CHAT_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Reaction summaries for all fetched messages in one query.
  const ids = data.map((r) => r.id);
  const reactions = await getReactionsForTargets("comment", ids);
  const empty: ReactionSummary = {
    counts: { fire: 0, clap: 0, laugh: 0, think: 0, shock: 0, skull: 0 },
    mine: [],
  };

  // Reverse to chronological (oldest first) for a natural chat read.
  return data
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      body: row.body,
      created_at: row.created_at,
      pinned_at: row.pinned_at,
      author: normalizeAuthor(row.author),
      reactions: reactions.get(row.id) ?? empty,
    }))
    .reverse();
}

/**
 * Returns every active member (invite-only app → everyone is a salon member),
 * for client-side @mention autocomplete and realtime author resolution.
 */
export async function listChatMembers(): Promise<ChatMember[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .is("deleted_at", null)
    .order("username", { ascending: true });
  return (data ?? []) as ChatMember[];
}
