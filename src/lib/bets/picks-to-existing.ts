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
    } else if (p.bet_type === "anytime_scorer" && Array.isArray(payload?.players)) {
      const players = (payload.players as { player_name?: unknown }[])
        .map((pl) => ({ player_name: String(pl?.player_name ?? "").trim() }))
        .filter((pl) => pl.player_name.length > 0)
        .slice(0, 4);
      if (players.length > 0) out.anytime_scorer = { players };
    }
  }
  return out;
}
