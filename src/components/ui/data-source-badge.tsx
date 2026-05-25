"use client";

import { useEffect, useState } from "react";
import { Database, RadioTower, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Source = "hermes" | "fifa" | "admin" | "manual" | "api-football";

const SOURCE_META: Record<Source, { fr: string; en: string; icon: typeof Database }> = {
  hermes: { fr: "Hermes", en: "Hermes", icon: Sparkles },
  fifa: { fr: "FIFA", en: "FIFA", icon: ShieldCheck },
  admin: { fr: "Admin", en: "Admin", icon: ShieldCheck },
  manual: { fr: "Saisie manuelle", en: "Manual", icon: ShieldCheck },
  "api-football": { fr: "API-Football", en: "API-Football", icon: RadioTower },
};

/**
 * Inline chip that tells the user how fresh the data on screen is and
 * where it came from. Live-updates the "il y a Xmin" portion every
 * minute so the page doesn't appear stale.
 *
 *   "Mis à jour il y a 3 min · Hermes"
 *
 * Pass `updatedAt` as an ISO string. If null, falls back to a neutral
 * "Source: ..." label (no freshness indicator).
 */
export function DataSourceBadge({
  source,
  updatedAt,
  locale,
  className,
}: {
  source: Source;
  updatedAt: string | null;
  locale: Locale;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!updatedAt) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [updatedAt]);

  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  const sourceLabel = locale === "fr" ? meta.fr : meta.en;

  let freshness: string | null = null;
  let isStale = false;
  if (updatedAt) {
    const delta = now - new Date(updatedAt).getTime();
    const mins = Math.floor(delta / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (delta < 0) {
      freshness = locale === "fr" ? "à l'instant" : "just now";
    } else if (mins < 1) {
      freshness = locale === "fr" ? "à l'instant" : "just now";
    } else if (mins < 60) {
      freshness =
        locale === "fr" ? `il y a ${mins} min` : `${mins} min ago`;
    } else if (hours < 24) {
      freshness =
        locale === "fr" ? `il y a ${hours} h` : `${hours} h ago`;
    } else {
      freshness =
        locale === "fr" ? `il y a ${days} j` : `${days} d ago`;
    }
    isStale = mins > 30;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        isStale
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-white/[0.1] bg-white/[0.04] text-text-tertiary",
        className,
      )}
      title={
        updatedAt
          ? new Date(updatedAt).toLocaleString(
              locale === "fr" ? "fr-CA" : "en-CA",
              { dateStyle: "long", timeStyle: "short" },
            )
          : undefined
      }
    >
      <Icon className="size-3" strokeWidth={2} />
      {freshness ? (
        <>
          {locale === "fr" ? "Mis à jour" : "Updated"} {freshness}
          <span className="text-text-tertiary/70">·</span>
          {sourceLabel}
        </>
      ) : (
        <>
          {locale === "fr" ? "Source" : "Source"}
          <span className="text-text-tertiary/70">·</span>
          {sourceLabel}
        </>
      )}
    </span>
  );
}
