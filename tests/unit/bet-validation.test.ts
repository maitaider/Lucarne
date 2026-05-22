import { describe, it, expect } from "vitest";
import {
  placeBetFormSchema,
  matchWinnerPayloadSchema,
  exactScorePayloadSchema,
  estimatePayout,
  betMultipliers,
} from "@/lib/bets/types";

const matchId = "123e4567-e89b-42d3-a456-426614174000";
const reqId = "123e4567-e89b-42d3-a456-426614174001";

describe("Bet payload schemas", () => {
  it("accepts a valid match_winner payload", () => {
    expect(matchWinnerPayloadSchema.parse({ winner: "home" }).winner).toBe("home");
    expect(matchWinnerPayloadSchema.parse({ winner: "draw" }).winner).toBe("draw");
    expect(matchWinnerPayloadSchema.parse({ winner: "away" }).winner).toBe("away");
  });

  it("rejects an invalid match_winner payload", () => {
    expect(() => matchWinnerPayloadSchema.parse({ winner: "tie" })).toThrow();
    expect(() => matchWinnerPayloadSchema.parse({})).toThrow();
  });

  it("accepts exact_score with integer scores 0-9", () => {
    expect(exactScorePayloadSchema.parse({ home: 0, away: 0 })).toBeTruthy();
    expect(exactScorePayloadSchema.parse({ home: 9, away: 9 })).toBeTruthy();
  });

  it("rejects negative or oversized exact_score values", () => {
    expect(() => exactScorePayloadSchema.parse({ home: -1, away: 0 })).toThrow();
    expect(() => exactScorePayloadSchema.parse({ home: 0, away: 10 })).toThrow();
    expect(() => exactScorePayloadSchema.parse({ home: 1.5, away: 0 })).toThrow();
  });
});

describe("placeBetFormSchema (whole-form validation)", () => {
  const baseForm = {
    match_id: matchId,
    league_id: null,
    bet: {
      bet_type: "match_winner" as const,
      match_id: matchId,
      payload: { winner: "home" as const },
    },
    stake_cents: 5000,
    client_request_id: reqId,
  };

  it("accepts a valid match_winner form", () => {
    const result = placeBetFormSchema.safeParse(baseForm);
    expect(result.success).toBe(true);
  });

  it("rejects stakes below 10 cents", () => {
    const result = placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 5 });
    expect(result.success).toBe(false);
  });

  it("rejects stakes above 100 000 cents (1000 chips)", () => {
    const result = placeBetFormSchema.safeParse({
      ...baseForm,
      stake_cents: 100_001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary stakes (10 and 100 000)", () => {
    expect(placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 10 }).success).toBe(true);
    expect(placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 100_000 }).success).toBe(true);
  });

  it("rejects non-UUID match_id", () => {
    const result = placeBetFormSchema.safeParse({ ...baseForm, match_id: "not-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("estimatePayout", () => {
  it("matches the configured multipliers", () => {
    expect(estimatePayout("match_winner", 100)).toBe(100 * betMultipliers.match_winner);
    expect(estimatePayout("exact_score", 50)).toBe(50 * betMultipliers.exact_score);
  });

  it("returns the stake itself for unknown bet types (×1)", () => {
    expect(estimatePayout("unknown_type", 100)).toBe(100);
  });

  it("rounds to nearest integer for fractional multipliers", () => {
    // over_under = 2.5×
    expect(estimatePayout("over_under", 10)).toBe(25);
  });
});
