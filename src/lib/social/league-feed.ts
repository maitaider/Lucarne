import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type LeaguePost = {
  id: string;
  league_id: string;
  author_id: string;
  parent_post_id: string | null;
  body: string;
  kind: "message" | "announcement" | "system";
  pinned_at: string | null;
  edited_at: string | null;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export async function listLeaguePosts(
  leagueId: string,
  limit = 50,
): Promise<LeaguePost[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("league_posts")
    .select(
      "id, league_id, author_id, parent_post_id, body, kind, pinned_at, edited_at, created_at, author:profiles!league_posts_author_id_fkey(username, display_name, avatar_url)",
    )
    .eq("league_id", leagueId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => {
    const author = Array.isArray(r.author)
      ? r.author[0]
      : r.author;
    return {
      id: r.id,
      league_id: r.league_id,
      author_id: r.author_id,
      parent_post_id: r.parent_post_id,
      body: r.body,
      kind: r.kind as LeaguePost["kind"],
      pinned_at: r.pinned_at,
      edited_at: r.edited_at,
      created_at: r.created_at,
      author: author ?? {
        username: "?",
        display_name: null,
        avatar_url: null,
      },
    };
  });
}
