"use client";

import { useMemo, useState } from "react";
import { BetCard } from "@/components/bet/bet-card";
import type { BetListItem } from "@/lib/bets/queries";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { Search, X } from "lucide-react";

type TabKey = "all" | "validated" | "settled" | "other";

export function BetsTabsPanel({
  bets,
  locale,
}: {
  bets: BetListItem[];
  locale: Locale;
}) {
  const [active, setActive] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: bets.length,
      validated: 0,
      settled: 0,
      other: 0,
    };
    for (const b of bets) {
      if (b.status === "validated") c.validated += 1;
      else if (b.status === "settled") c.settled += 1;
      else c.other += 1;
    }
    return c;
  }, [bets]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return bets.filter((b) => {
      // Status filter
      if (active === "validated" && b.status !== "validated") return false;
      if (active === "settled" && b.status !== "settled") return false;
      if (active === "other" && !["rejected", "refunded"].includes(b.status))
        return false;

      // Search filter (team names)
      if (lower) {
        const matchText = [
          b.match?.home_team?.name_fr,
          b.match?.home_team?.name_en,
          b.match?.away_team?.name_fr,
          b.match?.away_team?.name_en,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!matchText.includes(lower)) return false;
      }
      return true;
    });
  }, [bets, active, query]);

  const tabs: { key: TabKey; fr: string; en: string }[] = [
    { key: "all", fr: "Tous", en: "All" },
    { key: "validated", fr: "Actifs", en: "Active" },
    { key: "settled", fr: "Résolus", en: "Settled" },
    { key: "other", fr: "Autres", en: "Other" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => {
            const isActive = active === t.key;
            const count = counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  isActive
                    ? "bg-primary-500 text-abyss shadow-glow-primary"
                    : "border border-white/[0.08] bg-white/[0.04] text-text-secondary hover:border-white/[0.16] hover:text-text-primary",
                )}
              >
                {locale === "fr" ? t.fr : t.en}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-abyss/30 text-abyss"
                      : "bg-white/[0.07] text-text-tertiary",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary"
            strokeWidth={2}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "fr" ? "Filtrer par équipe…" : "Filter by team…"}
            className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-9 text-xs text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/40 focus:bg-white/[0.07]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={locale === "fr" ? "Effacer" : "Clear"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-tertiary hover:bg-white/10 hover:text-text-primary"
            >
              <X className="size-3" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Filtered list */}
      {filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-8 text-center text-sm text-text-secondary backdrop-blur-xl">
          {locale === "fr"
            ? "Aucun pari correspondant."
            : "No matching bet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bet) => (
            <BetCard key={bet.id} bet={bet} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
