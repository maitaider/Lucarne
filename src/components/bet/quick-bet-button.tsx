"use client";

import {
  type QuickBetMatch,
  type QuickBetExistingPicks,
} from "./quick-bet-provider";
import { useRouter } from "@/i18n/navigation";
import { Lock, Pencil, Ticket, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Compact "Pronostiquer" pill that opens the QuickBet sheet.
 * Designed to live inside a clickable MatchCard — stops propagation so it
 * doesn't also navigate to the match detail page.
 *
 * When `canBet` is false, the click routes to /buy-in instead of opening
 * the sheet. The visual treatment also flips to a paywall CTA.
 */
export function QuickBetButton({
  match,
  locale,
  variant = "strip",
  hasPick = false,
  existing,
  canBet = true,
}: {
  match: QuickBetMatch;
  locale: Locale;
  variant?: "strip" | "pill" | "block";
  hasPick?: boolean;
  existing?: QuickBetExistingPicks;
  /** When false, click sends the user to /buy-in. Defaults to true for back-compat. */
  canBet?: boolean;
}) {
  const router = useRouter();
  // Single source of truth: every match prediction (winner via the scoreline,
  // total goals, scorers) is made on the Pronostics page. Non-payers go to the
  // buy-in first. `match`/`existing` are kept in the API for back-compat.
  void match;
  void existing;

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    router.push(canBet ? "/predict" : "/buy-in");
  }

  let editLabelFr: string;
  let editLabelEn: string;
  let Icon: typeof Zap;
  if (!canBet) {
    editLabelFr = "Acheter ma place";
    editLabelEn = "Buy my seat";
    Icon = Ticket;
  } else if (hasPick) {
    editLabelFr = "Modifier le pronostic";
    editLabelEn = "Edit pick";
    Icon = Pencil;
  } else {
    editLabelFr = "Pronostiquer";
    editLabelEn = "Quick bet";
    Icon = Zap;
  }

  if (variant === "strip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group/btn -mx-4 -mb-4 mt-3 flex items-center justify-between border-t px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition",
          !canBet
            ? "border-gold-500/30 bg-gold-500/[0.1] text-gold-300 hover:bg-gold-500/[0.16]"
            : hasPick
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
            !canBet
              ? "text-gold-300 opacity-80"
              : hasPick
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
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ring-1 transition",
          !canBet
            ? "bg-gold-500/15 text-gold-300 ring-gold-500/35 hover:bg-gold-500/25"
            : "bg-primary-500/15 text-primary-400 ring-primary-500/30 hover:bg-primary-500/25",
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} />
        {locale === "fr" ? editLabelFr : editLabelEn}
      </button>
    );
  }

  // "block" — large CTA used in match detail page or dashboard cockpit.
  if (!canBet) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-gold transition hover:bg-gold-400"
      >
        <Lock className="size-4" strokeWidth={2.5} />
        {locale === "fr"
          ? "Acheter ma place pour parier"
          : "Buy my seat to bet"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
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
