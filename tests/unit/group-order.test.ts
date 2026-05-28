import { describe, expect, it } from "vitest";
import {
  computeGroupOrder,
  type GroupFixture,
} from "@/lib/predictions/group-order";

const TEAMS = ["A", "B", "C", "D"];

/** Round-robin fixtures with explicit results. */
function fixtures(
  results: Partial<Record<"AB" | "AC" | "AD" | "BC" | "BD" | "CD", GroupFixture["result"]>>,
): GroupFixture[] {
  const pairs: [string, string, keyof typeof results][] = [
    ["A", "B", "AB"],
    ["A", "C", "AC"],
    ["A", "D", "AD"],
    ["B", "C", "BC"],
    ["B", "D", "BD"],
    ["C", "D", "CD"],
  ];
  return pairs.map(([h, a, key]) => ({
    home_team_id: h,
    away_team_id: a,
    result: results[key] ?? null,
  }));
}

describe("computeGroupOrder", () => {
  it("ranks by points when there's a clear order", () => {
    // A wins all, B beats C+D, C beats D.
    const { order, stats } = computeGroupOrder(
      fixtures({
        AB: "home",
        AC: "home",
        AD: "home",
        BC: "home",
        BD: "home",
        CD: "home",
      }),
      TEAMS,
      TEAMS,
    );
    expect(order).toEqual(["A", "B", "C", "D"]);
    expect(stats.A.points).toBe(9);
    expect(stats.B.points).toBe(6);
    expect(stats.C.points).toBe(3);
    expect(stats.D.points).toBe(0);
  });

  it("breaks a points tie with head-to-head", () => {
    // C=6 (top), A=4 & B=4 tied, D=2. A beat B head-to-head → A before B.
    const { order } = computeGroupOrder(
      fixtures({
        AB: "home", // A beats B
        AC: "away", // C beats A
        AD: "draw",
        BC: "home", // B beats C
        BD: "draw",
        CD: "home", // C beats D
      }),
      TEAMS,
      TEAMS,
    );
    expect(order).toEqual(["C", "A", "B", "D"]);
  });

  it("handles partial predictions (unplayed fixtures ignored)", () => {
    const { order, stats } = computeGroupOrder(
      fixtures({ AB: "home" }),
      TEAMS,
      TEAMS,
    );
    expect(order[0]).toBe("A");
    expect(stats.A.points).toBe(3);
    expect(stats.A.played).toBe(1);
    expect(stats.C.played).toBe(0);
  });

  it("falls back to the stable order when nothing separates teams", () => {
    const { order } = computeGroupOrder(fixtures({}), TEAMS, ["D", "C", "B", "A"]);
    expect(order).toEqual(["D", "C", "B", "A"]);
  });
});
