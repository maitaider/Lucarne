import { describe, it, expect } from "vitest";
import {
  placeBetFormSchema,
  matchWinnerPayloadSchema,
  exactScorePayloadSchema,
  totalGoalsPayloadSchema,
  POINTS_SCHEME,
  maxPointsFor,
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

  it("accepts total_goals 0-15", () => {
    expect(totalGoalsPayloadSchema.parse({ total: 0 }).total).toBe(0);
    expect(totalGoalsPayloadSchema.parse({ total: 15 }).total).toBe(15);
  });

  it("rejects out-of-range total_goals", () => {
    expect(() => totalGoalsPayloadSchema.parse({ total: -1 })).toThrow();
    expect(() => totalGoalsPayloadSchema.parse({ total: 16 })).toThrow();
    expect(() => totalGoalsPayloadSchema.parse({ total: 2.5 })).toThrow();
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
    stake_cents: 0,
    client_request_id: reqId,
  };

  it("accepts a valid match_winner form (points-only)", () => {
    const result = placeBetFormSchema.safeParse(baseForm);
    expect(result.success).toBe(true);
  });

  it("accepts stake_cents = 0 (free, points-only)", () => {
    const result = placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects stakes above 100 000 cents (1000 chips)", () => {
    const result = placeBetFormSchema.safeParse({
      ...baseForm,
      stake_cents: 100_001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary stakes (0 and 100 000)", () => {
    expect(placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 0 }).success).toBe(true);
    expect(placeBetFormSchema.safeParse({ ...baseForm, stake_cents: 100_000 }).success).toBe(true);
  });

  it("rejects negative stakes", () => {
    const result = placeBetFormSchema.safeParse({ ...baseForm, stake_cents: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID match_id", () => {
    const result = placeBetFormSchema.safeParse({ ...baseForm, match_id: "not-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("Points scheme (maxPointsFor)", () => {
  it("returns 3 pts for match_winner", () => {
    expect(maxPointsFor("match_winner")).toBe(POINTS_SCHEME.match_winner);
  });

  it("returns 5 pts max for total_goals (exact)", () => {
    expect(maxPointsFor("total_goals")).toBe(POINTS_SCHEME.total_goals_exact);
  });

  it("returns 8 pts for first_scorer", () => {
    expect(maxPointsFor("first_scorer")).toBe(POINTS_SCHEME.first_scorer);
  });

  it("returns scaled max for anytime_scorer (4 players × 4 pts)", () => {
    expect(maxPointsFor("anytime_scorer")).toBe(
      POINTS_SCHEME.anytime_scorer_each * 4,
    );
  });

  it("returns 0 pts for unknown bet types", () => {
    expect(maxPointsFor("unknown_type")).toBe(0);
  });
});
