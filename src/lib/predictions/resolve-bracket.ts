/**
 * Pure helpers (client + server safe) to turn the user's bracket prediction
 * into a "filled bracket" — every knockout slot resolved to a team_id given
 * the user's group standings + knockout winner picks.
 *
 *  - R32 slots use placeholders like "1A" (1st of group A), "2B" (2nd of
 *    group B), or "3ACDF" (third-placed from one of A/C/D/F). For the
 *    third-placed pool we can't resolve unambiguously from group standings
 *    alone — the UI lets the user pick which team fills the slot via a
 *    secondary map (`third_place_assignments`). When the slot is still
 *    unfilled we surface null.
 *  - R16+ slots use placeholders like "W73" (winner of match #73). We
 *    look those up against `knockout_winners[match_number]`.
 */

export type GroupStandings = Record<string, string[]>; // group_label -> [1st, 2nd, 3rd, 4th]
export type KnockoutWinners = Record<string, string>; // match_number-as-string -> team_id

export type BracketSlot = {
  /** "1A", "2B", "3ACDF", "W73", ... */
  placeholder: string;
  /** Resolved team_id, or null if the user hasn't filled the upstream picks. */
  team_id: string | null;
  /** True iff this slot draws from the third-place pool (e.g. "3ACDF"). */
  is_third_place_pool: boolean;
  /** Group letters this slot can draw from when it's a third-place pool. */
  third_place_candidate_groups: string[];
};

export function resolveSlot(
  placeholder: string | null,
  groups: GroupStandings,
  knockouts: KnockoutWinners,
): BracketSlot {
  const slot: BracketSlot = {
    placeholder: placeholder ?? "",
    team_id: null,
    is_third_place_pool: false,
    third_place_candidate_groups: [],
  };
  if (!placeholder) return slot;
  const ph = placeholder.trim().toUpperCase();

  // R16+ winner-of-match shape: "W<number>"
  const wMatch = /^W(\d+)$/.exec(ph);
  if (wMatch) {
    slot.team_id = knockouts[wMatch[1]!] ?? null;
    return slot;
  }

  // Group-rank shape: "1A", "2B"
  const rankMatch = /^([12])([A-L])$/.exec(ph);
  if (rankMatch) {
    const rank = Number(rankMatch[1]); // 1 or 2
    const group = rankMatch[2]!;
    slot.team_id = groups[group]?.[rank - 1] ?? null;
    return slot;
  }

  // Third-place pool shape: "3<one-or-more-group-letters>", e.g. "3ACDF"
  const thirdMatch = /^3([A-L]+)$/.exec(ph);
  if (thirdMatch) {
    slot.is_third_place_pool = true;
    slot.third_place_candidate_groups = thirdMatch[1]!.split("");
    // Slot resolution for third-place pools happens via the dedicated
    // `third_place_assignments` map — see fillR32 below.
    return slot;
  }

  return slot;
}

/**
 * Lightweight bracket structure that the UI walks to draw every tie. It's
 * pre-computed once from the static schedule and re-used across renders.
 */
export type BracketMatchInfo = {
  match_number: number;
  stage: "r32" | "r16" | "qf" | "sf" | "third_place" | "final";
  home_placeholder: string | null;
  away_placeholder: string | null;
};

/**
 * Resolve a knockout match's home + away team_id given current picks.
 * - For R32 third-place pool slots, callers can pass `thirdPlaceAssignments`
 *   keyed by `<match_number>-home` / `<match_number>-away` (the UI lets the
 *   user pick a third-placed team from the candidate groups).
 */
export function resolveMatch(
  match: BracketMatchInfo,
  groups: GroupStandings,
  knockouts: KnockoutWinners,
  thirdPlaceAssignments?: Record<string, string>,
): { home: BracketSlot; away: BracketSlot } {
  const home = resolveSlot(match.home_placeholder, groups, knockouts);
  const away = resolveSlot(match.away_placeholder, groups, knockouts);
  if (thirdPlaceAssignments) {
    if (home.is_third_place_pool && !home.team_id) {
      home.team_id =
        thirdPlaceAssignments[`${match.match_number}-home`] ?? null;
    }
    if (away.is_third_place_pool && !away.team_id) {
      away.team_id =
        thirdPlaceAssignments[`${match.match_number}-away`] ?? null;
    }
  }
  return { home, away };
}

/**
 * Cascade: if the user changes their R32 winner, every downstream R16/QF/SF/
 * Final pick that no longer references a valid team should be cleared. Call
 * this on every save.
 */
export function pruneOrphanedKnockoutPicks(
  matches: BracketMatchInfo[],
  groups: GroupStandings,
  knockouts: KnockoutWinners,
  thirdPlaceAssignments?: Record<string, string>,
): KnockoutWinners {
  const fresh: KnockoutWinners = {};
  const byNum = new Map<number, BracketMatchInfo>();
  for (const m of matches) byNum.set(m.match_number, m);

  // Walk in stage order to ensure upstream picks resolve first.
  const order: BracketMatchInfo["stage"][] = [
    "r32",
    "r16",
    "qf",
    "sf",
    "third_place",
    "final",
  ];
  const ordered = matches
    .slice()
    .sort(
      (a, b) =>
        order.indexOf(a.stage) - order.indexOf(b.stage) ||
        a.match_number - b.match_number,
    );

  for (const m of ordered) {
    const { home, away } = resolveMatch(
      m,
      groups,
      fresh, // <-- use freshly pruned winners so far for upstream resolution
      thirdPlaceAssignments,
    );
    const pick = knockouts[String(m.match_number)];
    if (pick && (pick === home.team_id || pick === away.team_id)) {
      fresh[String(m.match_number)] = pick;
    }
    // else: pick was for a team that no longer feeds this match → drop it
  }
  return fresh;
}
