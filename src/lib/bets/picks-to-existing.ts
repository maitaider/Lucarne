import type { MyPick } from "./my-picks";
import type { QuickBetExistingPicks } from "@/components/bet/quick-bet-provider";

/**
 * Converts an array of MyPick rows for one match into the
 * QuickBetExistingPicks shape consumed by the QuickBet sheet.
 * Only "validated" bets pre-fill the form; settled bets are historical.
 */
export function picksToExisting(
  picks: MyPick[] | undefined,
): QuickBetExistingPicks {
  const out: QuickBetExistingPicks = {};
  if (!picks) return out;
  let exactScore: { home: number; away: number } | null = null;
  for (const p of picks) {
    if (p.status !== "validated") continue;
    const payload = p.payload as Record<string, unknown>;
    if (p.bet_type === "match_winner" && typeof payload?.winner === "string") {
      const w = payload.winner;
      if (w === "home" || w === "draw" || w === "away") {
        out.match_winner = { winner: w };
      }
    } else if (p.bet_type === "total_goals" && typeof payload?.total === "number") {
      out.total_goals = { total: payload.total };
    } else if (
      p.bet_type === "exact_score" &&
      typeof payload?.home === "number" &&
      typeof payload?.away === "number"
    ) {
      exactScore = { home: payload.home, away: payload.away };
    }
  }
  // A score prediction made on /predict (bet_type 'exact_score') implies a
  // winner and a total. Surface them in the quick-bet sheet so the player sees
  // their existing pick and doesn't re-enter it (which would create duplicate
  // match_winner/total_goals bets). Explicit quick-bet picks take precedence.
  if (exactScore) {
    if (!out.match_winner) {
      out.match_winner = {
        winner:
          exactScore.home > exactScore.away
            ? "home"
            : exactScore.home < exactScore.away
              ? "away"
              : "draw",
      };
    }
    if (!out.total_goals) {
      out.total_goals = { total: exactScore.home + exactScore.away };
    }
  }
  return out;
}
