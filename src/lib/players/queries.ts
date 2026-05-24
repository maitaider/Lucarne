import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type PlayerRow = {
  id: string;
  team_id: string;
  team_fifa_code: string;
  team_iso_code: string | null;
  full_name: string;
  display_name: string;
  position: "GK" | "DEF" | "MID" | "FWD" | null;
  shirt_number: number | null;
  club: string | null;
};

/**
 * Fetch all active players for the given team ids. Used by the pick'em
 * board to populate the scorer picker for every rendered match.
 * Returns an empty array if Supabase isn't configured (tests/local).
 */
export async function listPlayersForTeams(
  teamIds: string[],
): Promise<PlayerRow[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || teamIds.length === 0) return [];
  const ids = Array.from(new Set(teamIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .schema("ref")
    .from("players")
    .select(
      `
      id, team_id, name, display_name, position, shirt_number, club,
      team:teams!players_team_id_fkey(fifa_code, iso_code)
    `,
    )
    .eq("active", true)
    .in("team_id", ids);

  if (error || !data) {
    console.error("[players:listPlayersForTeams]", error);
    return [];
  }

  return data.map((r) => {
    const team = pickOne(
      r.team as
        | { fifa_code: string; iso_code: string | null }
        | { fifa_code: string; iso_code: string | null }[]
        | null,
    );
    return {
      id: r.id,
      team_id: r.team_id,
      team_fifa_code: team?.fifa_code ?? "",
      team_iso_code: team?.iso_code ?? null,
      full_name: r.name,
      display_name: r.display_name ?? r.name,
      position: (r.position as PlayerRow["position"]) ?? null,
      shirt_number: r.shirt_number,
      club: r.club ?? null,
    };
  });
}

/** Single team's full roster (for /admin/players). */
export async function listPlayersByTeam(teamId: string): Promise<PlayerRow[]> {
  return listPlayersForTeams([teamId]);
}

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
