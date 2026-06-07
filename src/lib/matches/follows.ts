import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import { listMatches, type MatchListItem } from "./queries";

/** Match ids the signed-in user follows (their personal calendar). */
export async function listMyFollowedMatchIds(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.rpc("my_followed_match_ids");
  if (error || !data) return [];
  return data as string[];
}

/** Full match objects for the user's followed matches, soonest kickoff first. */
export async function getFollowedMatches(): Promise<MatchListItem[]> {
  const ids = await listMyFollowedMatchIds();
  if (ids.length === 0) return [];
  const set = new Set(ids);
  const all = await listMatches();
  return all
    .filter((m) => set.has(m.id))
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
}
