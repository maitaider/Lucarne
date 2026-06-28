"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { MatchRow } from "@/components/admin/match-results-admin";
import type { MatchListItem } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Admin-only dashboard widget: enter match results without leaving the home
 * dashboard. `matches` is the server-computed "to settle" set (live, or kicked
 * off but not finished) so the admin lands on exactly what needs a score now;
 * <LiveRefresh> on the dashboard keeps the list fresh. Each row reuses the same
 * fast editor as /admin/matches (steppers, one-tap status, auto-finish). The
 * widget is purely a convenience surface — the underlying server action still
 * re-checks is_admin in the SECURITY DEFINER RPC, so rendering it can't grant
 * anything a non-admin couldn't already be stopped from doing.
 */
export function AdminQuickResults({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  const fr = locale === "fr";
  // Auto-open the single match when there's exactly one to settle — the common
  // live case is "one match on, punch in the score": one fewer tap.
  const [openId, setOpenId] = useState<string | null>(
    matches.length === 1 ? (matches[0]?.id ?? null) : null,
  );
  const count = matches.length;

  return (
    <section className="overflow-hidden rounded-lg border border-gold-500/25 bg-gold-500/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <header className="flex items-center gap-3 border-b border-gold-500/15 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30">
          <ShieldCheck className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
            <span className="truncate">
              {fr ? "Admin · résultats à régler" : "Admin · results to settle"}
            </span>
            {count > 0 && (
              <span
                className="shrink-0 rounded-full bg-error/20 px-1.5 text-[11px] font-bold tabular-nums text-error"
                aria-label={
                  fr ? `${count} à régler` : `${count} to settle`
                }
              >
                {count}
              </span>
            )}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
            {fr
              ? "Saisis le score, passe en « Terminé » → pronostics réglés."
              : "Enter the score, set “Finished” → predictions settle."}
          </p>
        </div>
        <Link
          href="/admin/matches"
          aria-label={fr ? "Gérer tous les matchs" : "Manage all matches"}
          className="group inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          <span className="hidden sm:inline">
            {fr ? "Tout gérer" : "Manage all"}
          </span>
          <ArrowRight
            className="size-3.5 transition group-hover:translate-x-0.5"
            strokeWidth={1.8}
          />
        </Link>
      </header>

      {count === 0 ? (
        <p className="px-4 py-3.5 text-center text-sm text-text-tertiary">
          {fr
            ? "Aucun match à régler — tout est à jour ✓"
            : "Nothing to settle — all caught up ✓"}
        </p>
      ) : (
        <ul className="space-y-1.5 p-3">
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              fr={fr}
              open={openId === m.id}
              onToggle={() => setOpenId((id) => (id === m.id ? null : m.id))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
