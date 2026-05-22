"use client";

import { useQuickBet, type QuickBetMatch } from "./quick-bet-provider";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Compact "Pronostiquer" pill that opens the QuickBet sheet.
 * Designed to live inside a clickable MatchCard — stops propagation so it
 * doesn't also navigate to the match detail page.
 */
export function QuickBetButton({
  match,
  locale,
  variant = "strip",
}: {
  match: QuickBetMatch;
  locale: Locale;
  variant?: "strip" | "pill" | "block";
}) {
  const quickBet = useQuickBet();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    quickBet.open(match);
  }

  if (variant === "strip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group/btn -mx-4 -mb-4 mt-3 flex items-center justify-between border-t border-white/[0.08] bg-white/[0.035] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-tertiary transition hover:bg-primary-500/[0.1] hover:text-primary-400"
      >
        <span className="flex items-center gap-1.5">
          <Zap className="size-3" strokeWidth={2.5} />
          {locale === "fr" ? "Pronostiquer" : "Quick bet"}
        </span>
        <span className="text-primary-400 opacity-0 transition group-hover/btn:opacity-100">
          →
        </span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-400 ring-1 ring-primary-500/30 transition hover:bg-primary-500/25",
        )}
      >
        <Zap className="size-3" strokeWidth={2.5} />
        {locale === "fr" ? "Pronostiquer" : "Quick bet"}
      </button>
    );
  }

  // "block" — large CTA used in match detail page or dashboard cockpit.
  return (
    <button
      type="button"
      onClick={handleClick}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
    >
      <Zap className="size-4" strokeWidth={2.5} />
      {locale === "fr" ? "Pronostiquer en 1 clic" : "Quick bet now"}
    </button>
  );
}
