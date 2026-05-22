import "server-only";
import { getStaticWorldCupMatches } from "@/data/world-cup-2026";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { MatchListItem, TeamSnippet } from "@/lib/matches/queries";

export type GroupStanding = {
  team: TeamSnippet;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  // Recent form, oldest→newest: "W" | "D" | "L"
  form: ("W" | "D" | "L")[];
};

export type GroupTable = {
  group_label: string;
  standings: GroupStanding[];
};

/**
 * Computes group-stage standings from finished matches.
 * Scheduled matches are reflected via "played = 0" rows so the table always
 * shows all 4 teams.
 */
export async function getGroupStandings(): Promise<GroupTable[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return computeGroupTables(getStaticWorldCupMatches().filter((match) => match.stage === "group"));
  }
  const supabase = await getSupabaseServer();

  const { data: matches, error } = await supabase
    .schema("ref")
    .from("matches")
    .select(
      `
      id, group_label, status, home_score, away_score, kickoff_at,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code, iso_code, name_fr, name_en, flag_emoji, logo_url)
    `,
    )
    .eq("stage", "group")
    .order("kickoff_at", { ascending: true });

  if (error || !matches) {
    console.error("[matches:getGroupStandings]", error);
    return [];
  }

  return computeGroupTables(matches);
}

type GroupMatchLike = Pick<
  MatchListItem,
  "group_label" | "status" | "home_score" | "away_score"
> & {
  home_team: TeamSnippet | TeamSnippet[] | null;
  away_team: TeamSnippet | TeamSnippet[] | null;
};

function computeGroupTables(matches: GroupMatchLike[]): GroupTable[] {
  // Bucket per group
  type Acc = Map<string, GroupStanding>;
  const groups = new Map<string, Acc>();

  function ensureTeam(group: string, team: TeamSnippet): GroupStanding {
    let acc = groups.get(group);
    if (!acc) {
      acc = new Map();
      groups.set(group, acc);
    }
    let row = acc.get(team.id);
    if (!row) {
      row = {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_diff: 0,
        points: 0,
        form: [],
      };
      acc.set(team.id, row);
    }
    return row;
  }

  for (const m of matches) {
    const group = m.group_label;
    if (!group) continue;
    // Single-relation embeds come back as objects (one-to-one FK).
    const home = (Array.isArray(m.home_team) ? m.home_team[0] : m.home_team) as TeamSnippet | null;
    const away = (Array.isArray(m.away_team) ? m.away_team[0] : m.away_team) as TeamSnippet | null;
    if (home) ensureTeam(group, home);
    if (away) ensureTeam(group, away);

    if (m.status !== "finished" || m.home_score === null || m.away_score === null) continue;
    if (!home || !away) continue;

    const h = ensureTeam(group, home);
    const a = ensureTeam(group, away);
    h.played += 1;
    a.played += 1;
    h.goals_for += m.home_score;
    h.goals_against += m.away_score;
    a.goals_for += m.away_score;
    a.goals_against += m.home_score;

    if (m.home_score > m.away_score) {
      h.wins += 1;
      h.points += 3;
      h.form.push("W");
      a.losses += 1;
      a.form.push("L");
    } else if (m.home_score < m.away_score) {
      a.wins += 1;
      a.points += 3;
      a.form.push("W");
      h.losses += 1;
      h.form.push("L");
    } else {
      h.draws += 1;
      a.draws += 1;
      h.points += 1;
      a.points += 1;
      h.form.push("D");
      a.form.push("D");
    }

    h.goal_diff = h.goals_for - h.goals_against;
    a.goal_diff = a.goals_for - a.goals_against;
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group_label, acc]) => ({
      group_label,
      standings: Array.from(acc.values()).sort(rankCompare),
    }));
}

function rankCompare(a: GroupStanding, b: GroupStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
  if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
  return a.team.name_fr.localeCompare(b.team.name_fr);
}
