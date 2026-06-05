import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getReactionsForTargets, type ReactionSummary } from "@/lib/social/queries";
import { getSharedPrediction, type SharedPrediction } from "@/lib/social/share";
import { listMatches } from "@/lib/matches/queries";
import { GLOBAL_CHAT_ID, CHAT_BOT_USER_ID } from "./constants";

export type ChatAuthor = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

export type ChatReplyPreview = { author: string; body: string };

export type ChatPoll = {
  id: string;
  question: string;
  options: string[];
  counts: number[];
  total: number;
  my_vote: number | null;
  closes_at: string | null;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  pinned_at: string | null;
  reply_to_id: string | null;
  reply: ChatReplyPreview | null;
  image_url: string | null;
  poll: ChatPoll | null;
  bet_card: SharedPrediction | null;
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

const BETID_RE =
  /\/p\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

export function firstBetId(body: string): string | null {
  return body.match(BETID_RE)?.[1] ?? null;
}

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
 * Returns the latest global-salon messages in chronological order, each with
 * author, reactions, reply preview, attached image, poll (with live counts +
 * the caller's vote) and a rich prediction card when a `/p/<betId>` link is
 * shared and the match has kicked off.
 */
export async function listChatMessages(limit = 80): Promise<ChatMessage[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const ids = data.map((r) => r.id);

  // Reply previews (RLS hides deleted parents).
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

  // Polls attached to these messages + vote aggregates.
  const pollMap = new Map<string, ChatPoll>();
  const { data: polls } = await supabase
    .from("chat_polls")
    .select("id, comment_id, question, options, closes_at")
    .in("comment_id", ids);
  if (polls && polls.length > 0) {
    const { data: votes } = await supabase
      .from("chat_poll_votes")
      .select("poll_id, option_idx, user_id")
      .in(
        "poll_id",
        polls.map((p) => p.id),
      );
    for (const p of polls) {
      const opts = (p.options as string[]) ?? [];
      const counts = new Array(opts.length).fill(0);
      let total = 0;
      let myVote: number | null = null;
      for (const v of votes ?? []) {
        if (v.poll_id !== p.id) continue;
        if (v.option_idx >= 0 && v.option_idx < counts.length) counts[v.option_idx] += 1;
        total += 1;
        if (user && v.user_id === user.id) myVote = v.option_idx;
      }
      pollMap.set(p.comment_id, {
        id: p.id,
        question: p.question,
        options: opts,
        counts,
        total,
        my_vote: myVote,
        closes_at: p.closes_at,
      });
    }
  }

  // Rich prediction cards for shared /p/<betId> links (visible post-kickoff).
  const betIdByComment = new Map<string, string>();
  for (const r of data) {
    const bid = firstBetId(r.body);
    if (bid) betIdByComment.set(r.id, bid);
  }
  const cardMap = new Map<string, SharedPrediction>();
  const uniqueBetIds = [...new Set(betIdByComment.values())];
  if (uniqueBetIds.length > 0) {
    const cards = await Promise.all(uniqueBetIds.map((b) => getSharedPrediction(b)));
    uniqueBetIds.forEach((b, i) => {
      const c = cards[i];
      if (c) cardMap.set(b, c);
    });
  }

  // Reactions.
  const reactions = await getReactionsForTargets("comment", ids);
  const empty: ReactionSummary = {
    counts: { fire: 0, clap: 0, laugh: 0, think: 0, shock: 0, skull: 0 },
    mine: [],
  };

  return data
    .map((row) => {
      const bid = betIdByComment.get(row.id);
      return {
        id: row.id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        pinned_at: row.pinned_at,
        reply_to_id: row.reply_to_id,
        reply: row.reply_to_id ? (replyMap.get(row.reply_to_id) ?? null) : null,
        image_url: row.image_url,
        poll: pollMap.get(row.id) ?? null,
        bet_card: bid ? (cardMap.get(bid) ?? null) : null,
        author: normalizeAuthor(row.author),
        reactions: reactions.get(row.id) ?? empty,
      };
    })
    .reverse();
}

/**
 * Active members for @mention autocomplete, realtime author resolution + roles.
 * Excludes the system bot (not a real member — not mentionable / not counted).
 */
export async function listChatMembers(): Promise<ChatMember[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role")
    .is("deleted_at", null)
    .neq("id", CHAT_BOT_USER_ID)
    .order("username", { ascending: true });
  return (data ?? []) as ChatMember[];
}

/**
 * Currently-muted members. RLS returns the caller's own row + (for admins) all.
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

export type ChatLiveMatch = {
  id: string;
  home_name_fr: string | null;
  home_name_en: string | null;
  home_iso: string | null;
  away_name_fr: string | null;
  away_name_en: string | null;
  away_iso: string | null;
  home_score: number | null;
  away_score: number | null;
};

/** Matches currently live — powers the salon "watch party" score bar. */
export async function listLiveMatches(): Promise<ChatLiveMatch[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const all = await listMatches();
  return all
    .filter((m) => m.status === "live")
    .map((m) => ({
      id: m.id,
      home_name_fr: m.home_team?.name_fr ?? null,
      home_name_en: m.home_team?.name_en ?? null,
      home_iso: m.home_team?.iso_code ?? null,
      away_name_fr: m.away_team?.name_fr ?? null,
      away_name_en: m.away_team?.name_en ?? null,
      away_iso: m.away_team?.iso_code ?? null,
      home_score: m.home_score,
      away_score: m.away_score,
    }));
}
