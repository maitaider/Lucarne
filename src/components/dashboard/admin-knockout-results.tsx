"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MatchRow } from "@/components/admin/match-results-admin";
import { groupMatchesByDate, type MatchListItem } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Admin-only dashboard panel to enter/adjust knockout results, grouped BY DAY.
 * Replaces the old "to settle" widget that only surfaced live/kicked-off matches
 * (so it sat empty between match days, with no way to adjust anything). Here the
 * admin picks a day and edits any match inline — including correcting a finished
 * one. Each row reuses the same fast editor as /admin/matches; the underlying
 * RPC re-checks is_admin, so this surface grants nothing on its own.
 */
export function AdminKnockoutResults({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  const fr = locale === "fr";

  const byDay = useMemo(() => groupMatchesByDate(matches), [matches]);
  const days = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  // Default to the first day that still has an unplayed match (the day the admin
  // most likely needs now); else the last day.
  const defaultDay = useMemo(() => {
    for (const d of days) {
      if ((byDay.get(d) ?? []).some((m) => m.status !== "finished")) return d;
    }
    return days[days.length - 1] ?? null;
  }, [days, byDay]);

  const [selDay, setSelDay] = useState<string | null>(defaultDay);
  const [openId, setOpenId] = useState<string | null>(null);

  const activeDay = selDay && byDay.has(selDay) ? selDay : defaultDay;
  const dayMatches = useMemo(
    () =>
      (activeDay ? (byDay.get(activeDay) ?? []) : [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
        ),
    [activeDay, byDay],
  );

  if (days.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-gold-500/25 bg-gold-500/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <header className="flex items-center gap-3 border-b border-gold-500/15 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30">
          <ShieldCheck className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-sm font-semibold text-text-primary">
            {fr ? "Admin · Phase finale — résultats" : "Admin · Knockouts — results"}
          </h2>
          <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
            {fr
              ? "Choisis un jour, saisis ou corrige les scores. Les points se recalculent à chaque score."
              : "Pick a day, enter or fix scores. Points recompute on every score."}
          </p>
        </div>
        <Link
          href="/admin/matches"
          aria-label={fr ? "Gérer tous les matchs" : "Manage all matches"}
          className="group inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          <span className="hidden sm:inline">{fr ? "Tout gérer" : "Manage all"}</span>
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" strokeWidth={1.8} />
        </Link>
      </header>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2.5">
        {days.map((d) => {
          const ms = byDay.get(d) ?? [];
          const pending = ms.filter((m) => m.status !== "finished").length;
          const active = d === activeDay;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setSelDay(d);
                setOpenId(null);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-gold-500/90 text-abyss"
                  : "border border-white/[0.1] bg-white/[0.03] text-text-secondary hover:text-text-primary",
              )}
            >
              {dayLabel(d, fr)}
              {pending > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-abyss/20 text-abyss" : "bg-white/[0.08] text-text-tertiary",
                  )}
                >
                  {pending}
                </span>
              ) : (
                <span className={cn("text-[11px]", active ? "text-abyss/70" : "text-primary-400")}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="space-y-1.5 p-3">
        {dayMatches.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            fr={fr}
            open={openId === m.id}
            onToggle={() => setOpenId((id) => (id === m.id ? null : m.id))}
          />
        ))}
        {dayMatches.length === 0 && (
          <li className="px-2 py-4 text-center text-sm text-text-tertiary">
            {fr ? "Aucun match ce jour." : "No match this day."}
          </li>
        )}
      </ul>
    </section>
  );
}

/** "lun. 29 juin" — parsed at noon to dodge any DST edge on the date boundary. */
function dayLabel(isoDate: string, fr: boolean): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
