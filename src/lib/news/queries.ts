import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type NewsPost = {
  id: string;
  title: string;
  body: string;
  kind: "news" | "announcement" | "release" | "match_recap" | "system";
  source: "admin" | "hermes" | "system";
  cover_url: string | null;
  published_at: string;
  expires_at: string | null;
};

export async function listNewsPosts(limit = 20): Promise<NewsPost[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("news_posts")
    .select(
      "id, title, body, kind, source, cover_url, published_at, expires_at",
    )
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    kind: r.kind as NewsPost["kind"],
    source: r.source as NewsPost["source"],
    cover_url: r.cover_url,
    published_at: r.published_at,
    expires_at: r.expires_at,
  }));
}
