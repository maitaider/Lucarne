import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getReactionsForTargets, type ReactionSummary } from "@/lib/social/queries";
import { GLOBAL_CHAT_ID } from "./constants";

export type ChatAuthor = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type ChatReplyPreview = { author: string; body: string };

export type ChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  pinned_at: string | null;
  reply_to_id: string | null;
  reply: ChatReplyPreview | null;
  image_url: string | null;
  author: ChatAuthor;
  reactions: ReactionSummary;
};

/** A salon member, used client-side to resolve realtime authors + @mentions. */
export type ChatMember = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type ChatMute = { user_id: string; until: string | null };

function normalizeAuthor(raw: unknown): ChatAuthor {
  const a = Array.isArray(raw) ? raw[0] : raw;
  const author = (a ?? {}) as Partial<ChatAuthor>;
  return {
    username: author.username ?? "?",
    display_name: author.display_name ?? null,
    avatar_url: author.avatar_url ?? null,
    role: author.role ?? "player",
  };
}

/**
 * Returns the latest global-salon messages in chronological order (oldest →
 * newest), each with author profile, reaction summary and (for replies) a small
 * preview of the cited message. Soft-deleted rows are excluded by RLS.
 */
export async function listChatMessages(limit = 80): Promise<ChatMessage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, user_id, body, created_at, pinned_at, reply_to_id, image_url, author:profiles!comments_user_id_fkey(username, display_name, avatar_url, role)",
    )
    .eq("parent_type", "global")
    .eq("parent_id", GLOBAL_CHAT_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  // Reply previews: fetch the cited messages in one query (RLS hides deleted).
  const replyIds = [...new Set(data.map((r) => r.reply_to_id).filter(Boolean))] as string[];
  const replyMap = new Map<string, ChatReplyPreview>();
  if (replyIds.length > 0) {
    const { data: parents } = await supabase
      .from("comments")
      .select("id, body, author:profiles!comments_user_id_fkey(username)")
      .in("id", replyIds);
    for (const p of parents ?? []) {
      const a = Array.isArray(p.author) ? p.author[0] : p.author;
      replyMap.set(p.id, {
        author: (a as { username?: string } | null)?.username ?? "?",
        body: p.body,
      });
    }
  }

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
      reply_to_id: row.reply_to_id,
      reply: row.reply_to_id ? (replyMap.get(row.reply_to_id) ?? null) : null,
      image_url: row.image_url,
      author: normalizeAuthor(row.author),
      reactions: reactions.get(row.id) ?? empty,
    }))
    .reverse();
}

/**
 * Returns every active member (invite-only app → everyone is a salon member),
 * for client-side @mention autocomplete, realtime author resolution + roles.
 */
export async function listChatMembers(): Promise<ChatMember[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role")
    .is("deleted_at", null)
    .order("username", { ascending: true });
  return (data ?? []) as ChatMember[];
}

/**
 * Currently-muted members. RLS returns the caller's own row (so a muted user
 * sees they're muted) and, for admins, every row. Expired mutes are filtered out.
 */
export async function listChatMutes(): Promise<ChatMute[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("chat_mutes").select("user_id, until");
  const now = Date.now();
  return (data ?? [])
    .filter((m) => !m.until || new Date(m.until).getTime() > now)
    .map((m) => ({ user_id: m.user_id, until: m.until }));
}
