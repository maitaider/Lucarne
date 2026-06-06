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

/**
 * A team can occupy at most ONE knockout slot. Third-place assignments are a
 * loose `"<match>-<side>" → team_id` map the user fills via dropdowns. Without
 * guarding, the same predicted-3rd team can be dropped into two *overlapping*
 * pool slots (e.g. "3EHIJK" and "3AEHIJ" both accept group E's 3rd), or a team
 * reordered out of 3rd keeps a stale assignment while *also* qualifying
 * directly as a 1st/2nd — both make a team appear twice in the bracket.
 *
 * Returns a cleaned copy where every kept assignment:
 *   1. targets a real third-place-pool slot, and
 *   2. names the user's predicted 3rd (index 2) of one of that slot's
 *      candidate groups, and
 *   3. is unique — the same team is never assigned to two slots (first wins,
 *      ordered by match number then home-before-away) and is never a team that
 *      already qualifies directly (sits at index 0/1 of any group).
 */
export function sanitizeThirdPlaceAssignments(
  thirdPlaceAssignments: Record<string, string>,
  groups: GroupStandings,
  matches: BracketMatchInfo[],
): Record<string, string> {
  // Teams that already qualify directly as a group winner or runner-up.
  const directQualifiers = new Set<string>();
  for (const arr of Object.values(groups)) {
    if (arr[0]) directQualifiers.add(arr[0]);
    if (arr[1]) directQualifiers.add(arr[1]);
  }

  // Per third-place slot, the teams it may legally take: the predicted 3rd
  // (index 2) of each of its candidate groups.
  const allowedByKey = new Map<string, Set<string>>();
  for (const m of matches) {
    for (const side of ["home", "away"] as const) {
      const ph = side === "home" ? m.home_placeholder : m.away_placeholder;
      const slot = resolveSlot(ph, groups, {});
      if (!slot.is_third_place_pool) continue;
      const allowed = new Set<string>();
      for (const g of slot.third_place_candidate_groups) {
        const third = groups[g]?.[2];
        if (third) allowed.add(third);
      }
      allowedByKey.set(`${m.match_number}-${side}`, allowed);
    }
  }

  // Stable order so "first assignment wins" is deterministic.
  const keys = Object.keys(thirdPlaceAssignments).sort((a, b) => {
    const [am, asd] = a.split("-");
    const [bm, bsd] = b.split("-");
    return (
      Number(am) - Number(bm) || (asd === bsd ? 0 : asd === "home" ? -1 : 1)
    );
  });

  const clean: Record<string, string> = {};
  const used = new Set<string>();
  for (const key of keys) {
    const teamId = thirdPlaceAssignments[key];
    if (!teamId) continue;
    const allowed = allowedByKey.get(key);
    if (!allowed || !allowed.has(teamId)) continue; // not a valid 3rd here
    if (directQualifiers.has(teamId)) continue; // already qualifies directly
    if (used.has(teamId)) continue; // already placed in another slot
    clean[key] = teamId;
    used.add(teamId);
  }
  return clean;
}
