import "server-only";
import {
  getAppSettings,
  getProjectedCollectedCents,
  computePrizePool,
  type AppSettings,
} from "@/lib/admin/economy";

export type ProjectedPayouts = {
  total_collected_cents: number;
  house_cents: number;
  pool_cents: number;
  /**
   * Per-rank payouts (cents). Index 0 = 1st place, index 1 = 2nd, etc.
   * Length matches `settings.prize_distribution.shares.length` (default 3).
   */
  payouts: number[];
  /** Share % for each rank (mirrors `payouts` length). */
  shares: number[];
  /** App settings (used by callers for currency + tournament dates). */
  settings: AppSettings;
};

/**
 * Snapshot of the projected payouts assuming the tournament ended right now.
 * Combines real-money payments collected so far with the configured
 * distribution shares. Used by the leaderboard to show top players
 * "what you would win today".
 */
export async function getProjectedPayouts(): Promise<ProjectedPayouts> {
  // `collected` MUST come from the shared SECURITY DEFINER aggregate, not the
  // RLS-bound admin view — otherwise a non-admin sees only their own payment and
  // the projected pot collapses to a single contribution.
  const [settings, collected] = await Promise.all([
    getAppSettings(),
    getProjectedCollectedCents(),
  ]);
  const { house_cents, pool_cents, payouts } = computePrizePool(
    collected,
    settings,
  );
  return {
    total_collected_cents: collected,
    house_cents,
    pool_cents,
    payouts,
    shares: settings.prize_distribution.shares ?? [],
    settings,
  };
}
