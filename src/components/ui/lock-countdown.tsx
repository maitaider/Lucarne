"use client";

import { useEffect, useState } from "react";
import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Live "Verrouille dans Xj Yh" countdown driven by a target ISO timestamp.
 * Self-updates every minute. Colour goes from default (gold) → urgent (red)
 * within the last `urgentWithinHours` (24 by default). After the target
 * passes, shows "Verrouillé".
 */
export function LockCountdown({
  targetAt,
  locale,
  className,
  prefix,
  pastLabel,
  urgentWithinHours = 24,
}: {
  targetAt: string;
  locale: Locale;
  className?: string;
  /** Optional override, e.g. "Coup d'envoi dans" / "Kicks off in". */
  prefix?: { fr: string; en: string };
  /** Optional label shown after the target has passed. */
  pastLabel?: { fr: string; en: string };
  /** Hours before the target at which the pill turns red. */
  urgentWithinHours?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(targetAt).getTime();
  const delta = target - now;

  if (delta <= 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary",
          className,
        )}
      >
        <Lock className="size-3" strokeWidth={2.5} />
        {pastLabel
          ? locale === "fr"
            ? pastLabel.fr
            : pastLabel.en
          : locale === "fr"
            ? "Verrouillé"
            : "Locked"}
      </span>
    );
  }

  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);

  const urgent = delta < urgentWithinHours * 3_600_000;
  const tone = urgent
    ? "border-error/40 bg-error/15 text-error"
    : "border-gold-500/35 bg-gold-500/15 text-gold-300";

  const dayUnit = locale === "fr" ? "j" : "d";
  const label =
    days > 0
      ? `${days}${dayUnit} ${hours}h`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

  return (
    <span
      title={new Date(targetAt).toLocaleString(
        locale === "fr" ? "fr-CA" : "en-CA",
        { dateStyle: "long", timeStyle: "short" },
      )}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tone,
        className,
      )}
    >
      <Clock className="size-3" strokeWidth={2.5} />
      {prefix
        ? `${locale === "fr" ? prefix.fr : prefix.en} ${label}`
        : locale === "fr"
          ? `Verrouille dans ${label}`
          : `Locks in ${label}`}
    </span>
  );
}
