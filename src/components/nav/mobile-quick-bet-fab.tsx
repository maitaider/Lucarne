"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { type QuickBetMatch } from "@/components/bet/quick-bet-provider";
import { Zap } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Floating Action Button visible on mobile only. Tap → Pronostics page (the
 * single source of truth for all predictions). Hidden on md+.
 */
export function MobileQuickBetFab({
  locale,
  nextMatch,
}: {
  locale: Locale;
  nextMatch: QuickBetMatch | null;
}) {
  const pathname = usePathname();
  if (!nextMatch) return null;
  // Hide on the chat route: the FAB sits bottom-right, over the chat composer's
  // send button. (And on /predict it's redundant — that's where it links.)
  if (pathname === "/chat" || pathname === "/predict") return null;

  return (
    <Link
      href="/predict"
      aria-label={locale === "fr" ? "Faire mes pronostics" : "Make my predictions"}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-3 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-95 md:hidden"
    >
      <Zap className="size-4" strokeWidth={2.5} />
      {locale === "fr" ? "Pronostiquer" : "Predict"}
    </Link>
  );
}
