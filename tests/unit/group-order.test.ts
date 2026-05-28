import { describe, expect, it } from "vitest";
import {
  computeGroupOrder,
  type GroupFixture,
} from "@/lib/predictions/group-order";

const TEAMS = ["A", "B", "C", "D"];
type Pair = "AB" | "AC" | "AD" | "BC" | "BD" | "CD";

/** Round-robin fixtures with explicit [home, away] scorelines. */
function fixtures(scores: Partial<Record<Pair, [number, number]>>): GroupFixture[] {
  const pairs: [string, string, Pair][] = [
    ["A", "B", "AB"],
    ["A", "C", "AC"],
    ["A", "D", "AD"],
    ["B", "C", "BC"],
    ["B", "D", "BD"],
    ["C", "D", "CD"],
  ];
  return pairs.map(([h, a, key]) => {
    const s = scores[key];
    return {
      home_team_id: h,
      away_team_id: a,
      home_goals: s ? s[0] : null,
      away_goals: s ? s[1] : null,
    };
  });
}

describe("computeGroupOrder (scorelines)", () => {
  it("ranks by points when there's a clear order", () => {
    const { order, stats } = computeGroupOrder(
      fixtures({
        AB: [2, 0],
        AC: [2, 0],
        AD: [2, 0],
        BC: [1, 0],
        BD: [1, 0],
        CD: [1, 0],
      }),
      TEAMS,
      TEAMS,
    );
    expect(order).toEqual(["A", "B", "C", "D"]);
    expect(stats.A.points).toBe(9);
    expect(stats.A.gd).toBe(6);
    expect(stats.B.points).toBe(6);
  });

  it("breaks a points tie on goal difference", () => {
    // A & B both 7 pts (drew each other); A has a much better GD → A first.
    const { order } = computeGroupOrder(
      fixtures({
        AB: [1, 1],
        AC: [3, 0],
        AD: [3, 0],
        BC: [1, 0],
        BD: [1, 0],
        CD: [1, 0],
      }),
      TEAMS,
      TEAMS,
    );
    expect(order).toEqual(["A", "B", "C", "D"]);
  });

  it("handles partial predictions (unplayed fixtures ignored)", () => {
    const { order, stats } = computeGroupOrder(
      fixtures({ AB: [2, 0] }),
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
