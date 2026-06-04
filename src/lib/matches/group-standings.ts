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

type FinishedGM = {
  home_id: string;
  away_id: string;
  home_score: number;
  away_score: number;
};

function computeGroupTables(matches: GroupMatchLike[]): GroupTable[] {
  // Bucket per group
  type Acc = Map<string, GroupStanding>;
  const groups = new Map<string, Acc>();
  // Finished matches per group, kept for the head-to-head tie-break (I-2).
  const finishedByGroup = new Map<string, FinishedGM[]>();

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

    const fin = finishedByGroup.get(group) ?? [];
    fin.push({
      home_id: home.id,
      away_id: away.id,
      home_score: m.home_score,
      away_score: m.away_score,
    });
    finishedByGroup.set(group, fin);

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
      standings: rankGroup(
        Array.from(acc.values()),
        finishedByGroup.get(group_label) ?? [],
      ),
    }));
}

/**
 * FIFA group ranking — mirrors `public.actual_group_standings()` exactly so the
 * live table and the bracket scoring never diverge (I-2):
 *   1. overall points → goal difference → goals scored
 *   then, AMONG teams still tied on all three:
 *   2. head-to-head points → h2h goal difference → h2h goals scored
 *   3. team_id, the deterministic final key (stands in for fair-play / drawing
 *      of lots, and matches Postgres's uuid ordering so SQL and TS agree).
 */
function rankGroup(rows: GroupStanding[], matches: FinishedGM[]): GroupStanding[] {
  // 1. Overall order establishes the tiers.
  const overall = [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_diff - a.goal_diff ||
      b.goals_for - a.goals_for,
  );

  // 2. Tier number — teams sharing (points, GD, GF) share a tier.
  const tierOf = new Map<string, number>();
  let tier = 0;
  let prev: GroupStanding | null = null;
  for (const r of overall) {
    if (
      !prev ||
      prev.points !== r.points ||
      prev.goal_diff !== r.goal_diff ||
      prev.goals_for !== r.goals_for
    ) {
      tier += 1;
    }
    tierOf.set(r.team.id, tier);
    prev = r;
  }

  // 3. Head-to-head, over matches between same-tier (tied) teams only.
  const h2h = new Map<string, { pts: number; gd: number; gf: number }>();
  for (const r of rows) h2h.set(r.team.id, { pts: 0, gd: 0, gf: 0 });
  for (const m of matches) {
    const ht = tierOf.get(m.home_id);
    const at = tierOf.get(m.away_id);
    if (ht == null || at == null || ht !== at) continue;
    const hh = h2h.get(m.home_id);
    const ah = h2h.get(m.away_id);
    if (!hh || !ah) continue;
    hh.gf += m.home_score;
    hh.gd += m.home_score - m.away_score;
    ah.gf += m.away_score;
    ah.gd += m.away_score - m.home_score;
    if (m.home_score > m.away_score) hh.pts += 3;
    else if (m.home_score < m.away_score) ah.pts += 3;
    else {
      hh.pts += 1;
      ah.pts += 1;
    }
  }

  // 4. Final order: tier, then head-to-head, then team_id (codepoint order ==
  //    Postgres uuid order on canonical lowercase ids).
  return [...overall].sort((a, b) => {
    const ta = tierOf.get(a.team.id) ?? 0;
    const tb = tierOf.get(b.team.id) ?? 0;
    if (ta !== tb) return ta - tb;
    const ha = h2h.get(a.team.id)!;
    const hb = h2h.get(b.team.id)!;
    if (hb.pts !== ha.pts) return hb.pts - ha.pts;
    if (hb.gd !== ha.gd) return hb.gd - ha.gd;
    if (hb.gf !== ha.gf) return hb.gf - ha.gf;
    return a.team.id < b.team.id ? -1 : a.team.id > b.team.id ? 1 : 0;
  });
}
