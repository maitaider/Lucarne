"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Compact, inline countdown to a match kickoff — ticks every second.
 *
 * Pre-hydration it renders a stable placeholder (the server render matches the
 * first client render, so no hydration mismatch); real values land on mount.
 * Turns red within `urgentWithinHours`, shows `pastLabel` once kickoff passes.
 */
export function MatchCountdown({
  targetAt,
  locale,
  urgentWithinHours = 1,
  className,
  showIcon = true,
  compact = false,
}: {
  targetAt: string;
  locale: Locale;
  urgentWithinHours?: number;
  className?: string;
  showIcon?: boolean;
  /** Single dominant unit ("7 min", "21 h", "1 j") — for dense lists. */
  compact?: boolean;
}) {
  const fr = locale === "fr";
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(targetAt).getTime();
  const delta = now === null ? null : Math.max(target - now, 0);

  let text: string;
  let tone = "text-text-secondary";
  if (delta === null) {
    text = "—";
    tone = "text-text-tertiary";
  } else if (delta === 0) {
    text = fr ? "En cours" : "Live";
    tone = "text-violet-300";
  } else {
    const s = Math.floor(delta / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (compact) {
      text =
        d > 0
          ? `${d} j`
          : h > 0
            ? `${h} h`
            : m > 0
              ? `${m} min`
              : fr
                ? "imminent"
                : "soon";
    } else {
      text =
        d > 0
          ? `${d}j ${pad(h)}h ${pad(m)}m`
          : `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
    }
    if (delta < urgentWithinHours * 3_600_000) tone = "text-error";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums",
        tone,
        className,
      )}
      role="timer"
      aria-label={fr ? "Compte à rebours" : "Countdown"}
    >
      {showIcon && <Timer className="size-3.5 shrink-0" strokeWidth={2} />}
      {text}
    </span>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
