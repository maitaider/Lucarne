import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type TournamentPrediction = {
  /** group_label → [1st team_id, 2nd, 3rd, 4th]. Empty {} when fresh. */
  group_standings: Record<string, string[]>;
  /** match_number (as string) → predicted winner team_id. */
  knockout_winners: Record<string, string>;
  /** "<matchNumber>-home"|"-away" → 3rd-placed team_id (repêchage). */
  third_place_assignments: Record<string, string>;
  champion_team_id: string | null;
  top_scorer_player_id: string | null;
  locked_at: string | null;
  updated_at: string | null;
};

export function emptyPrediction(): TournamentPrediction {
  return {
    group_standings: {},
    knockout_winners: {},
    third_place_assignments: {},
    champion_team_id: null,
    top_scorer_player_id: null,
    locked_at: null,
    updated_at: null,
  };
}

/**
 * Server-only: are predictions globally locked (now ≥ the single deadline)?
 * Mirrors the `predictions_locked()` RPC — true once everyone's picks are
 * frozen, which gates revealing other players' predictions on their profile.
 */
export async function arePredictionsLocked(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.rpc("predictions_locked");
  return data === true;
}

/**
 * Server-only: read the signed-in user's current bracket prediction.
 * Returns a fresh empty shell when none exists, so the UI doesn't have to
 * special-case the "no row yet" path.
 */
export async function getMyTournamentPrediction(): Promise<TournamentPrediction> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return emptyPrediction();
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyPrediction();

  const { data } = await supabase
    .from("tournament_predictions")
    .select(
      "group_standings, knockout_winners, third_place_assignments, champion_team_id, top_scorer_player_id, locked_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return emptyPrediction();

  return {
    group_standings:
      (data.group_standings as Record<string, string[]>) ?? {},
    knockout_winners:
      (data.knockout_winners as Record<string, string>) ?? {},
    third_place_assignments:
      (data.third_place_assignments as Record<string, string>) ?? {},
    champion_team_id: data.champion_team_id,
    top_scorer_player_id: data.top_scorer_player_id,
    locked_at: data.locked_at,
    updated_at: data.updated_at,
  };
}
