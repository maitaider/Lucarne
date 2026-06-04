"use client";

import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { Trophy, ArrowRight } from "lucide-react";
import type { SharedPrediction } from "@/lib/social/share";
import type { Locale } from "@/i18n/routing";

function parseScore(payload: unknown): { home: number; away: number } | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.home === "number" && typeof p.away === "number") {
      return { home: p.home, away: p.away };
    }
  }
  return null;
}

/** Compact prediction card shown in the salon when a /p/<betId> link is shared. */
export function BetCard({
  pred,
  locale,
}: {
  pred: SharedPrediction;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const home = (fr ? pred.home.name_fr : pred.home.name_en) ?? "?";
  const away = (fr ? pred.away.name_fr : pred.away.name_en) ?? "?";
  const sc = parseScore(pred.payload);
  const won = pred.result === "won";
  return (
    <Link
      href={`/p/${pred.bet_id}`}
      className="mt-1 block max-w-sm rounded-[12px] border border-primary-500/25 bg-primary-500/[0.06] p-3 transition hover:border-primary-500/45 hover:bg-primary-500/[0.1]"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <Trophy className="size-3 text-gold-400" strokeWidth={2} />@{pred.username}{" "}
          {fr ? "a pronostiqué" : "predicted"}
        </span>
        {pred.points > 0 && (
          <span className={won ? "font-bold text-gold-300" : "font-bold text-text-secondary"}>
            +{pred.points} pts
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2.5 text-sm font-semibold text-text-primary">
        <span className="flex min-w-0 items-center gap-1.5">
          <Flag isoCode={pred.home.iso} size="xs" className="shrink-0" />
          <span className="truncate">{home}</span>
        </span>
        <span className="rounded-md bg-abyss/50 px-2 py-0.5 font-mono text-base tabular-nums">
          {sc ? `${sc.home}–${sc.away}` : "—"}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{away}</span>
          <Flag isoCode={pred.away.iso} size="xs" className="shrink-0" />
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-0.5 text-[11px] font-semibold text-primary-300">
        {fr ? "Voir le prono" : "View prediction"}
        <ArrowRight className="size-3" strokeWidth={2} />
      </div>
    </Link>
  );
}
