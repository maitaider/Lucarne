import { describe, expect, it } from "vitest";
import {
  resolveSlot,
  resolveMatch,
  pruneOrphanedKnockoutPicks,
  sanitizeThirdPlaceAssignments,
  type BracketMatchInfo,
  type GroupStandings,
  type KnockoutWinners,
} from "@/lib/predictions/resolve-bracket";

const TEAM = {
  A1: "team-a1",
  A2: "team-a2",
  A3: "team-a3",
  A4: "team-a4",
  B1: "team-b1",
  B2: "team-b2",
  B3: "team-b3",
  C3: "team-c3",
  D3: "team-d3",
  F3: "team-f3",
};

const SAMPLE_GROUPS: GroupStandings = {
  A: [TEAM.A1, TEAM.A2, TEAM.A3, TEAM.A4],
  B: [TEAM.B1, TEAM.B2, TEAM.B3, "team-b4"],
  C: ["team-c1", "team-c2", TEAM.C3, "team-c4"],
  D: ["team-d1", "team-d2", TEAM.D3, "team-d4"],
  F: ["team-f1", "team-f2", TEAM.F3, "team-f4"],
};

describe("resolveSlot", () => {
  it("resolves '1A' to the 1st team of group A", () => {
    const slot = resolveSlot("1A", SAMPLE_GROUPS, {});
    expect(slot.team_id).toBe(TEAM.A1);
    expect(slot.is_third_place_pool).toBe(false);
  });

  it("resolves '2B' to the 2nd team of group B", () => {
    const slot = resolveSlot("2B", SAMPLE_GROUPS, {});
    expect(slot.team_id).toBe(TEAM.B2);
  });

  it("resolves 'W73' to the winner of match 73", () => {
    const slot = resolveSlot("W73", SAMPLE_GROUPS, { "73": TEAM.A1 });
    expect(slot.team_id).toBe(TEAM.A1);
  });

  it("returns null team_id when upstream pick is missing", () => {
    const slot = resolveSlot("W73", SAMPLE_GROUPS, {});
    expect(slot.team_id).toBeNull();
  });

  it("flags third-place pool slots and lists candidate groups", () => {
    const slot = resolveSlot("3ACDF", SAMPLE_GROUPS, {});
    expect(slot.is_third_place_pool).toBe(true);
    expect(slot.third_place_candidate_groups).toEqual(["A", "C", "D", "F"]);
    // team_id stays null — caller resolves via thirdPlaceAssignments.
    expect(slot.team_id).toBeNull();
  });

  it("returns null for unknown placeholder shapes", () => {
    const slot = resolveSlot("XYZ", SAMPLE_GROUPS, {});
    expect(slot.team_id).toBeNull();
  });
});

describe("resolveMatch with third-place assignments", () => {
  it("fills a third-place pool slot from the assignment map", () => {
    const match: BracketMatchInfo = {
      match_number: 75,
      stage: "r32",
      home_placeholder: "1E",
      away_placeholder: "3ACDF",
    };
    const groups: GroupStandings = { ...SAMPLE_GROUPS, E: ["e1", "e2", "e3", "e4"] };
    const assignments = { "75-away": TEAM.D3 };
    const { home, away } = resolveMatch(match, groups, {}, assignments);
    expect(home.team_id).toBe("e1");
    expect(away.team_id).toBe(TEAM.D3);
  });
});

describe("pruneOrphanedKnockoutPicks", () => {
  const SCHEDULE: BracketMatchInfo[] = [
    {
      match_number: 73,
      stage: "r32",
      home_placeholder: "1A",
      away_placeholder: "2B",
    },
    {
      match_number: 74,
      stage: "r32",
      home_placeholder: "1B",
      away_placeholder: "2A",
    },
    {
      match_number: 89,
      stage: "r16",
      home_placeholder: "W73",
      away_placeholder: "W74",
    },
  ];

  it("keeps a winner pick that still matches one of the resolved teams", () => {
    const knockouts: KnockoutWinners = { "73": TEAM.A1 };
    const pruned = pruneOrphanedKnockoutPicks(SCHEDULE, SAMPLE_GROUPS, knockouts);
    expect(pruned["73"]).toBe(TEAM.A1);
  });

  it("drops a winner pick that no longer matches either resolved team", () => {
    // group A reordered: A2 is now 1st, so '1A' resolves to A2, not A1
    const reordered: GroupStandings = {
      ...SAMPLE_GROUPS,
      A: [TEAM.A2, TEAM.A1, TEAM.A3, TEAM.A4],
    };
    const knockouts: KnockoutWinners = { "73": TEAM.A1 };
    const pruned = pruneOrphanedKnockoutPicks(SCHEDULE, reordered, knockouts);
    // 73's home is now A2, away is B2 — A1 no longer feeds the match.
    expect(pruned["73"]).toBeUndefined();
  });

  it("prunes downstream R16 pick when upstream R32 winner is stale", () => {
    // We pick A1 to win R32 #73, and A1 to win R16 #89. Then we change groups
    // so '1A' no longer = A1. Both picks should drop.
    const reordered: GroupStandings = {
      ...SAMPLE_GROUPS,
      A: [TEAM.A2, TEAM.A1, TEAM.A3, TEAM.A4],
    };
    const knockouts: KnockoutWinners = { "73": TEAM.A1, "89": TEAM.A1 };
    const pruned = pruneOrphanedKnockoutPicks(SCHEDULE, reordered, knockouts);
    expect(pruned["73"]).toBeUndefined();
    expect(pruned["89"]).toBeUndefined();
  });
});

describe("sanitizeThirdPlaceAssignments", () => {
  // Two R32 matches whose away slot both draw from the SAME third-place pool
  // (candidate groups C/D/F overlap) — the setup that let a team appear twice.
  const SCHEDULE: BracketMatchInfo[] = [
    {
      match_number: 75,
      stage: "r32",
      home_placeholder: "1A",
      away_placeholder: "3CDF",
    },
    {
      match_number: 76,
      stage: "r32",
      home_placeholder: "1B",
      away_placeholder: "3CDF",
    },
  ];

  it("keeps distinct, valid third-place picks", () => {
    const clean = sanitizeThirdPlaceAssignments(
      { "75-away": TEAM.C3, "76-away": TEAM.D3 },
      SAMPLE_GROUPS,
      SCHEDULE,
    );
    expect(clean).toEqual({ "75-away": TEAM.C3, "76-away": TEAM.D3 });
  });

  it("drops a duplicate: the same 3rd assigned to two slots (first wins)", () => {
    const clean = sanitizeThirdPlaceAssignments(
      { "75-away": TEAM.C3, "76-away": TEAM.C3 },
      SAMPLE_GROUPS,
      SCHEDULE,
    );
    // Lower match number wins; the second slot is left empty for a re-pick.
    expect(clean).toEqual({ "75-away": TEAM.C3 });
  });

  it("drops a team that isn't a candidate group's predicted 3rd", () => {
    // A3 is group A's 3rd, but slot 75's pool is C/D/F — A isn't a candidate.
    const clean = sanitizeThirdPlaceAssignments(
      { "75-away": TEAM.A3 },
      SAMPLE_GROUPS,
      SCHEDULE,
    );
    expect(clean).toEqual({});
  });

  it("drops a stale pick after the team is reordered out of 3rd place", () => {
    // User assigned C3 (group C's 3rd) to slot 75, then promotes C3 to 2nd.
    // C's 3rd is now team-c2 and C3 qualifies directly → the pick must drop.
    const reordered: GroupStandings = {
      ...SAMPLE_GROUPS,
      C: ["team-c1", TEAM.C3, "team-c2", "team-c4"],
    };
    const clean = sanitizeThirdPlaceAssignments(
      { "75-away": TEAM.C3 },
      reordered,
      SCHEDULE,
    );
    expect(clean).toEqual({});
  });

  it("ignores empty assignments and non-third-place slots", () => {
    const clean = sanitizeThirdPlaceAssignments(
      { "75-away": "", "73-home": TEAM.C3 },
      SAMPLE_GROUPS,
      SCHEDULE,
    );
    expect(clean).toEqual({});
  });
});

describe("resolveSlot loser-of-match (third-place playoff)", () => {
  // Two semifinals + the third-place playoff between their losers.
  const SCHEDULE: BracketMatchInfo[] = [
    { match_number: 101, stage: "sf", home_placeholder: "1A", away_placeholder: "1B" },
    { match_number: 102, stage: "sf", home_placeholder: "2A", away_placeholder: "2B" },
    {
      match_number: 200,
      stage: "third_place",
      home_placeholder: "L101",
      away_placeholder: "L102",
    },
  ];

  it("resolves 'L101' to the loser of match 101", () => {
    // 101 = A1 vs B1; winner A1 → loser B1.
    const slot = resolveSlot("L101", SAMPLE_GROUPS, { "101": TEAM.A1 }, SCHEDULE);
    expect(slot.team_id).toBe(TEAM.B1);
  });

  it("returns null until the match winner is picked", () => {
    expect(resolveSlot("L101", SAMPLE_GROUPS, {}, SCHEDULE).team_id).toBeNull();
  });

  it("returns null without a schedule (can't find participants)", () => {
    expect(resolveSlot("L101", SAMPLE_GROUPS, { "101": TEAM.A1 }).team_id).toBeNull();
  });

  it("fills both third-place slots from the two semifinal losers", () => {
    const thirdMatch = SCHEDULE[2]!;
    // 101: A1 vs B1, winner A1 → loser B1. 102: A2 vs B2, winner B2 → loser A2.
    const { home, away } = resolveMatch(
      thirdMatch,
      SAMPLE_GROUPS,
      { "101": TEAM.A1, "102": TEAM.B2 },
      undefined,
      SCHEDULE,
    );
    expect(home.team_id).toBe(TEAM.B1);
    expect(away.team_id).toBe(TEAM.A2);
  });
});
