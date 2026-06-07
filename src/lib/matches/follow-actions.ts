"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

export type FollowResult = {
  ok: boolean;
  /** The follow state to reflect in the UI (unchanged from request on failure). */
  following: boolean;
  message?: string;
};

/**
 * Follow / unfollow a match for the signed-in user. Goes through the
 * `follow_match` / `unfollow_match` SECURITY DEFINER RPCs (auth.uid()-scoped).
 * Triggered from a client event handler, so revalidatePath is allowed.
 */
export async function setMatchFollow(
  matchId: string,
  follow: boolean,
): Promise<FollowResult> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, following: !follow, message: "auth" };

  const { error } = await supabase.rpc(
    follow ? "follow_match" : "unfollow_match",
    { p_match_id: matchId },
  );
  if (error) return { ok: false, following: !follow, message: error.message };

  // Surfaces that show followed matches.
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  return { ok: true, following: follow };
}
