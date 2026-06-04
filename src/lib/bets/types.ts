import { z } from "zod";

/**
 * Lucarne — Bet type definitions
 *
 * Each `bet_type` has a strongly-typed payload validated by Zod.
 * The discriminated union ensures TypeScript narrows correctly.
 */

// match_winner: { winner: "home" | "draw" | "away" }
export const matchWinnerPayloadSchema = z.object({
  winner: z.enum(["home", "draw", "away"]),
});

// exact_score: { home: 0-9, away: 0-9 }
export const exactScorePayloadSchema = z.object({
  home: z.number().int().min(0).max(9),
  away: z.number().int().min(0).max(9),
});

// total_goals: { total: 0-15 }
export const totalGoalsPayloadSchema = z.object({
  total: z.number().int().min(0).max(15),
});

// first_scorer: { player_name: string, team_id: uuid }
export const firstScorerPayloadSchema = z.object({
  player_name: z.string().min(2).max(80),
  team_id: z.string().uuid(),
});

// anytime_scorer: { players: [{ player_id?, player_name, team_id? }] }
// Empty array is allowed = "no scorer predicted" (lets the user clear/remove
// scorers). player_id is kept so the auto-scoring can match by id.
export const anytimeScorerPayloadSchema = z.object({
  players: z
    .array(
      z.object({
        player_id: z.string().uuid().optional(),
        player_name: z.string().min(1).max(80),
        team_id: z.string().uuid().optional(),
      }),
    )
    .max(4),
});

// both_teams_score: { both: boolean }
export const bothTeamsScorePayloadSchema = z.object({
  both: z.boolean(),
});

// over_under: { line: 2.5, side: "over" | "under" }
export const overUnderPayloadSchema = z.object({
  line: z.number(),
  side: z.enum(["over", "under"]),
});

// tournament_winner / top_scorer / golden_glove: { team_id } or { player_name }
export const tournamentWinnerPayloadSchema = z.object({
  team_id: z.string().uuid(),
});

export const topScorerPayloadSchema = z.object({
  player_name: z.string().min(2).max(80),
});

// Discriminated union of all payloads + their bet_type
export const placeBetInputSchema = z.discriminatedUnion("bet_type", [
  z.object({
    bet_type: z.literal("match_winner"),
    payload: matchWinnerPayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("total_goals"),
    payload: totalGoalsPayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("exact_score"),
    payload: exactScorePayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("first_scorer"),
    payload: firstScorerPayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("anytime_scorer"),
    payload: anytimeScorerPayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("both_teams_score"),
    payload: bothTeamsScorePayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("over_under"),
    payload: overUnderPayloadSchema,
    match_id: z.string().uuid(),
  }),
  z.object({
    bet_type: z.literal("tournament_winner"),
    payload: tournamentWinnerPayloadSchema,
    match_id: z.null(),
  }),
  z.object({
    bet_type: z.literal("top_scorer"),
    payload: topScorerPayloadSchema,
    match_id: z.null(),
  }),
]);

export const placeBetFormSchema = z.object({
  match_id: z.string().uuid(),
  league_id: z.string().uuid().nullable(),
  bet: placeBetInputSchema,
  // Stake en jetons — 0 par défaut (pari en points seulement).
  // Garde le slot pour évolutions futures (ex: ligues à mise libre).
  stake_cents: z.number().int().min(0).max(100_000).default(0),
  client_request_id: z.string().uuid(),
});

export type PlaceBetInput = z.infer<typeof placeBetInputSchema>;
export type PlaceBetForm = z.infer<typeof placeBetFormSchema>;

/**
 * Points scoring scheme (mirrors public.app_settings.scoring_rules and
 * the SQL compute_bet_points function — UI display only).
 */
export const POINTS_SCHEME = {
  match_winner: 3,
  total_goals_exact: 5,
  total_goals_close: 2,
  exact_score: 5,
  anytime_scorer_each: 4,
  first_scorer: 8,
} as const;

/** Returns the maximum points a bet type can yield (for the "+N points" hint).
 *  Score-only scoring: only winner / total goals / exact score award points. */
export function maxPointsFor(betType: string): number {
  switch (betType) {
    case "match_winner":
      return POINTS_SCHEME.match_winner;
    case "total_goals":
      return POINTS_SCHEME.total_goals_exact;
    case "exact_score":
      return POINTS_SCHEME.exact_score;
    default:
      return 0;
  }
}

/** Legacy alias kept for backward-compat with old call sites. */
export const betMultipliers: Record<string, number> = {
  match_winner: POINTS_SCHEME.match_winner,
  exact_score: POINTS_SCHEME.exact_score,
  total_goals: POINTS_SCHEME.total_goals_exact,
};
