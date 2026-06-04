import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { GLOBAL_CHAT_ID } from "./constants";

export type ChatReport = {
  comment_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author_username: string;
  author_avatar_url: string | null;
  author_muted: boolean;
  report_count: number;
  reasons: string[];
  first_reported_at: string;
  message_deleted: boolean;
};

export type MutedMember = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  reason: string | null;
  until: string | null;
  created_at: string;
  muted_by_username: string | null;
};

export type ChatRecentMessage = {
  id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  pinned_at: string | null;
  author: { username: string; display_name: string | null; avatar_url: string | null };
};

export type ChatModStats = {
  total: number;
  last24h: number;
  activeChatters: number;
  muted: number;
  openReports: number;
};

function one<T>(raw: unknown): T | null {
  return (Array.isArray(raw) ? raw[0] : raw) as T | null;
}

/** Open moderation reports (admin only — RPC raises for non-admins). */
export async function listChatReports(): Promise<ChatReport[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("admin_list_chat_reports");
  return ((data ?? []) as ChatReport[]).map((r) => ({
    ...r,
    reasons: r.reasons ?? [],
  }));
}

/** Currently-muted members (admin sees all via RLS). */
export async function listMutedMembers(): Promise<MutedMember[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("chat_mutes")
    .select(
      "user_id, reason, until, created_at, member:profiles!chat_mutes_user_id_fkey(username, display_name, avatar_url), muter:profiles!chat_mutes_muted_by_fkey(username)",
    )
    .order("created_at", { ascending: false });
  const now = Date.now();
  return (data ?? [])
    .filter((m) => !m.until || new Date(m.until).getTime() > now)
    .map((m) => {
      const member = one<{ username: string; display_name: string | null; avatar_url: string | null }>(m.member);
      const muter = one<{ username: string }>(m.muter);
      return {
        user_id: m.user_id,
        username: member?.username ?? "?",
        display_name: member?.display_name ?? null,
        avatar_url: member?.avatar_url ?? null,
        reason: m.reason,
        until: m.until,
        created_at: m.created_at,
        muted_by_username: muter?.username ?? null,
      };
    });
}

/** Most recent salon messages (for the admin moderation feed). */
export async function listRecentChatMessages(limit = 30): Promise<ChatRecentMessage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, user_id, body, image_url, created_at, pinned_at, author:profiles!comments_user_id_fkey(username, display_name, avatar_url)",
    )
    .eq("parent_type", "global")
    .eq("parent_id", GLOBAL_CHAT_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => {
    const a = one<{ username: string; display_name: string | null; avatar_url: string | null }>(row.author);
    return {
      id: row.id,
      user_id: row.user_id,
      body: row.body,
      image_url: row.image_url,
      created_at: row.created_at,
      pinned_at: row.pinned_at,
      author: {
        username: a?.username ?? "?",
        display_name: a?.display_name ?? null,
        avatar_url: a?.avatar_url ?? null,
      },
    };
  });
}

/** Headline moderation stats for the admin panel + salon hero. */
export async function getChatModStats(): Promise<ChatModStats> {
  const empty: ChatModStats = { total: 0, last24h: 0, activeChatters: 0, muted: 0, openReports: 0 };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return empty;
  const supabase = await getSupabaseServer();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const base = supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_type", "global")
    .eq("parent_id", GLOBAL_CHAT_ID)
    .is("deleted_at", null);

  const [{ count: total }, { count: last24h }, recent, { count: muted }, { count: openReports }] =
    await Promise.all([
      base,
      supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("parent_type", "global")
        .eq("parent_id", GLOBAL_CHAT_ID)
        .is("deleted_at", null)
        .gte("created_at", since),
      supabase
        .from("comments")
        .select("user_id")
        .eq("parent_type", "global")
        .eq("parent_id", GLOBAL_CHAT_ID)
        .is("deleted_at", null)
        .gte("created_at", since),
      supabase.from("chat_mutes").select("user_id", { count: "exact", head: true }),
      supabase
        .from("chat_reports")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null),
    ]);

  const activeChatters = new Set((recent.data ?? []).map((r) => r.user_id)).size;
  return {
    total: total ?? 0,
    last24h: last24h ?? 0,
    activeChatters,
    muted: muted ?? 0,
    openReports: openReports ?? 0,
  };
}
