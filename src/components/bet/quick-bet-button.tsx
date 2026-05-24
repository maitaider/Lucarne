"use client";

import {
  useQuickBet,
  type QuickBetMatch,
  type QuickBetExistingPicks,
} from "./quick-bet-provider";
import { Pencil, Zap } from "lucide-react";
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
  hasPick = false,
  existing,
}: {
  match: QuickBetMatch;
  locale: Locale;
  variant?: "strip" | "pill" | "block";
  hasPick?: boolean;
  existing?: QuickBetExistingPicks;
}) {
  const quickBet = useQuickBet();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    quickBet.open(match, existing);
  }

  const editLabelFr = hasPick ? "Modifier le pronostic" : "Pronostiquer";
  const editLabelEn = hasPick ? "Edit pick" : "Quick bet";
  const Icon = hasPick ? Pencil : Zap;

  if (variant === "strip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group/btn -mx-4 -mb-4 mt-3 flex items-center justify-between border-t px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition",
          hasPick
            ? "border-primary-500/25 bg-primary-500/[0.08] text-primary-300 hover:bg-primary-500/[0.14]"
            : "border-white/[0.08] bg-white/[0.035] text-text-tertiary hover:bg-primary-500/[0.1] hover:text-primary-400",
        )}
      >
        <span className="flex items-center gap-1.5">
          <Icon className="size-3" strokeWidth={2.5} />
          {locale === "fr" ? editLabelFr : editLabelEn}
        </span>
        <span
          className={cn(
            "transition",
            hasPick
              ? "text-primary-300 opacity-70"
              : "text-primary-400 opacity-0 group-hover/btn:opacity-100",
          )}
        >
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
        <Icon className="size-3" strokeWidth={2.5} />
        {locale === "fr" ? editLabelFr : editLabelEn}
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
      <Icon className="size-4" strokeWidth={2.5} />
      {hasPick
        ? locale === "fr"
          ? "Modifier mon pronostic"
          : "Edit my pick"
        : locale === "fr"
          ? "Pronostiquer en 1 clic"
          : "Quick bet now"}
    </button>
  );
}
