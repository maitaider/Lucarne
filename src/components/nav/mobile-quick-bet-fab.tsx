"use client";

import { useQuickBet, type QuickBetMatch } from "@/components/bet/quick-bet-provider";
import { Zap } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Floating Action Button visible on mobile only. Tap → opens QuickBet on the
 * next openable match. Hidden on md+ (header nav already exposes /matches).
 */
export function MobileQuickBetFab({
  locale,
  nextMatch,
}: {
  locale: Locale;
  nextMatch: QuickBetMatch | null;
}) {
  const quickBet = useQuickBet();

  if (!nextMatch) return null;

  return (
    <button
      type="button"
      onClick={() => quickBet.open(nextMatch)}
      aria-label={locale === "fr" ? "Parier sur le prochain match" : "Bet on next match"}
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-95 md:hidden"
    >
      <Zap className="size-4" strokeWidth={2.5} />
      {locale === "fr" ? "Pronostiquer" : "Quick bet"}
    </button>
  );
}
