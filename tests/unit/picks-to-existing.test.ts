import { describe, expect, it } from "vitest";
import { picksToExisting } from "@/lib/bets/picks-to-existing";
import type { MyPick } from "@/lib/bets/my-picks";

function pick(partial: Partial<MyPick>): MyPick {
  return {
    bet_id: "bet-1",
    match_id: "match-1",
    bet_type: "match_winner",
    payload: {},
    status: "validated",
    result: null,
    points: 0,
    submitted_at: new Date().toISOString(),
    ...partial,
  };
}

describe("picksToExisting", () => {
  it("returns an empty shape when no picks", () => {
    expect(picksToExisting(undefined)).toEqual({});
    expect(picksToExisting([])).toEqual({});
  });

  it("maps match_winner picks", () => {
    const out = picksToExisting([
      pick({
        bet_type: "match_winner",
        payload: { winner: "home" },
      }),
    ]);
    expect(out.match_winner).toEqual({ winner: "home" });
  });

  it("maps total_goals picks", () => {
    const out = picksToExisting([
      pick({ bet_type: "total_goals", payload: { total: 3 } }),
    ]);
    expect(out.total_goals).toEqual({ total: 3 });
  });

  it("ignores anytime_scorer picks (score-only scoring)", () => {
    const out = picksToExisting([
      pick({
        bet_type: "anytime_scorer",
        payload: { players: [{ player_name: "Mbappé" }] },
      }),
    ]);
    expect(out).toEqual({});
  });

  it("ignores settled or rejected picks", () => {
    expect(
      picksToExisting([
        pick({ status: "settled", payload: { winner: "home" } }),
        pick({ status: "rejected", payload: { winner: "draw" } }),
      ]),
    ).toEqual({});
  });

  it("ignores bets with invalid winner string", () => {
    const out = picksToExisting([
      pick({ bet_type: "match_winner", payload: { winner: "invalid" } }),
    ]);
    expect(out.match_winner).toBeUndefined();
  });
});
