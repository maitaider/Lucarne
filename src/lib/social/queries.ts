import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ReactionKind } from "./actions";

export type CommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null };
};

export type ReactionSummary = {
  counts: Record<ReactionKind, number>;
  mine: ReactionKind[];
};

const EMPTY_COUNTS: ReactionSummary["counts"] = {
  fire: 0,
  clap: 0,
  laugh: 0,
  think: 0,
  shock: 0,
  skull: 0,
};

/**
 * Returns reaction counts + the current user's own reactions for one target.
 * Falls back to zeros when unauthenticated or Supabase isn't configured.
 */
export async function getReactionsForTarget(
  targetType: "bet" | "comment",
  targetId: string,
): Promise<ReactionSummary> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { counts: { ...EMPTY_COUNTS }, mine: [] };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("reactions")
    .select("reaction, user_id")
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  const counts: ReactionSummary["counts"] = { ...EMPTY_COUNTS };
  const mine: ReactionKind[] = [];
  for (const r of data ?? []) {
    const kind = r.reaction as ReactionKind;
    if (counts[kind] !== undefined) counts[kind] += 1;
    if (user && r.user_id === user.id) mine.push(kind);
  }
  return { counts, mine };
}

/**
 * Bulk version: returns a Map<targetId, ReactionSummary> for many targets.
 * One query for all targets, server-side aggregation.
 */
export async function getReactionsForTargets(
  targetType: "bet" | "comment",
  targetIds: string[],
): Promise<Map<string, ReactionSummary>> {
  const result = new Map<string, ReactionSummary>();
  for (const id of targetIds) {
    result.set(id, { counts: { ...EMPTY_COUNTS }, mine: [] });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || targetIds.length === 0) {
    return result;
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("reactions")
    .select("target_id, reaction, user_id")
    .eq("target_type", targetType)
    .in("target_id", targetIds);

  for (const row of data ?? []) {
    const summary = result.get(row.target_id) ?? {
      counts: { ...EMPTY_COUNTS },
      mine: [],
    };
    const kind = row.reaction as ReactionKind;
    if (summary.counts[kind] !== undefined) summary.counts[kind] += 1;
    if (user && row.user_id === user.id) summary.mine.push(kind);
    result.set(row.target_id, summary);
  }
  return result;
}

/**
 * List comments for a parent (match/bet/league_feed), newest last.
 * Returns up to `limit` rows with author profile joined.
 */
export async function listComments(
  parentType: "match" | "bet" | "league_feed",
  parentId: string,
  limit = 50,
): Promise<CommentRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, user_id, body, created_at, author:profiles!comments_user_id_fkey(username, display_name, avatar_url)",
    )
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    author: Array.isArray(row.author)
      ? (row.author[0] ?? {
          username: "?",
          display_name: null,
          avatar_url: null,
        })
      : (row.author ?? {
          username: "?",
          display_name: null,
          avatar_url: null,
        }),
  }));
}
