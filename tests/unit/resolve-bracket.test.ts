import { describe, expect, it } from "vitest";
import {
  resolveSlot,
  resolveMatch,
  pruneOrphanedKnockoutPicks,
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
