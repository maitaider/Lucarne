import { describe, it, expect } from "vitest";
import { groupMatchesByDate, type MatchListItem } from "@/lib/matches/queries";

function makeMatch(id: string, kickoff_at: string): MatchListItem {
  return {
    id,
    match_number: 1,
    stage: "group",
    group_label: "A",
    kickoff_at,
    status: "scheduled",
    home_score: null,
    away_score: null,
    home_placeholder: null,
    away_placeholder: null,
    home_team: null,
    away_team: null,
    venue: null,
  };
}

describe("groupMatchesByDate", () => {
  it("groups matches under the local date of the kickoff (Europe/Paris)", () => {
    // 2026-06-11 03:00 UTC = 2026-06-11 05:00 in Paris (CEST)
    const m1 = makeMatch("a", "2026-06-11T03:00:00.000Z");
    // 2026-06-11 23:30 UTC = 2026-06-12 01:30 in Paris
    const m2 = makeMatch("b", "2026-06-11T23:30:00.000Z");

    const groups = groupMatchesByDate([m1, m2]);

    expect(groups.has("2026-06-11")).toBe(true);
    expect(groups.has("2026-06-12")).toBe(true);
    expect(groups.get("2026-06-11")?.length).toBe(1);
    expect(groups.get("2026-06-12")?.length).toBe(1);
  });

  it("respects an explicit timezone parameter", () => {
    // 2026-06-11 03:00 UTC = 2026-06-10 23:00 in Mexico City (UTC-4 in summer)
    const m = makeMatch("a", "2026-06-11T03:00:00.000Z");
    const groups = groupMatchesByDate([m], "America/Mexico_City");
    expect(groups.has("2026-06-10")).toBe(true);
  });

  it("returns empty map for empty input", () => {
    expect(groupMatchesByDate([]).size).toBe(0);
  });
});
