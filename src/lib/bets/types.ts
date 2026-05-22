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

// first_scorer: { player_name: string, team_id: uuid }
export const firstScorerPayloadSchema = z.object({
  player_name: z.string().min(2).max(80),
  team_id: z.string().uuid(),
});

// anytime_scorer: { players: [{ name, team_id }] }
export const anytimeScorerPayloadSchema = z.object({
  players: z
    .array(
      z.object({
        player_name: z.string().min(2).max(80),
        team_id: z.string().uuid(),
      }),
    )
    .min(1)
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
  stake_cents: z
    .number()
    .int()
    .min(10, "Mise minimale: 10 jetons")
    .max(100_000, "Mise maximale: 1 000 jetons"),
  client_request_id: z.string().uuid(),
});

export type PlaceBetInput = z.infer<typeof placeBetInputSchema>;
export type PlaceBetForm = z.infer<typeof placeBetFormSchema>;

/**
 * Multipliers for potential payout preview (mirrors the SQL scoring profile).
 * Used for UI only — SQL is the source of truth for actual settlement.
 */
export const betMultipliers: Record<string, number> = {
  match_winner: 2,
  exact_score: 8,
  first_scorer: 6,
  anytime_scorer: 3,
  both_teams_score: 2,
  over_under: 2.5,
  tournament_winner: 20,
  top_scorer: 15,
};

export function estimatePayout(betType: string, stake: number): number {
  return Math.round((betMultipliers[betType] ?? 1) * stake);
}
