"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Lock, Timer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Large interactive countdown (days / hours / min / sec) ticking every
 * second. Digits pop on change (`lk-pop` + React key). Before hydration it
 * renders placeholder digits — the first client render matches the server
 * one, so no mismatch; real values land on mount.
 *
 * Turns urgent (error tone) within `urgentWithinHours`. Once the target
 * passes it flips to `pastLabel`; the dashboard's LiveRefresh then swaps in
 * the next target within a minute.
 */
export function CountdownTimer({
  targetAt,
  locale,
  title,
  subtitle,
  href,
  urgentWithinHours = 3,
  pastLabel,
  className,
}: {
  targetAt: string;
  locale: Locale;
  /** Small uppercase heading, e.g. "Prochain verrou". */
  title: string;
  /** Context line shown next to the heading, e.g. the match teams. */
  subtitle?: string;
  /** Makes the whole block a link (e.g. to /predict). */
  href?: string;
  /** Hours before the target at which the block turns red. */
  urgentWithinHours?: number;
  /** Shown once the target has passed. */
  pastLabel: string;
  className?: string;
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
  const expired = delta === 0;
  const urgent =
    delta !== null && !expired && delta < urgentWithinHours * 3_600_000;

  const days = delta === null ? null : Math.floor(delta / 86_400_000);
  const hours =
    delta === null ? null : Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes =
    delta === null ? null : Math.floor((delta % 3_600_000) / 60_000);
  const seconds = delta === null ? null : Math.floor((delta % 60_000) / 1000);

  const cells: { value: number | null; label: string }[] = [
    { value: days, label: fr ? "Jours" : "Days" },
    { value: hours, label: fr ? "Heures" : "Hours" },
    { value: minutes, label: "Min" },
    { value: seconds, label: "Sec" },
  ];

  // Minute-level only: updating a live region every second is screen-reader
  // noise.
  const ariaLabel = expired
    ? pastLabel
    : delta === null
      ? title
      : fr
        ? `${title} : ${days} j ${hours} h ${minutes} min`
        : `${title}: ${days}d ${hours}h ${minutes}m`;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
            urgent ? "text-error" : "text-gold-300",
          )}
        >
          {expired ? (
            <Lock className="size-3 shrink-0" strokeWidth={2.5} />
          ) : (
            <Timer className="size-3 shrink-0" strokeWidth={2.5} />
          )}
          {expired ? pastLabel : title}
        </span>
        {subtitle && (
          <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-text-tertiary">
            <span className="truncate">{subtitle}</span>
            {href && (
              <ArrowRight
                className="size-3 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-text-primary"
                strokeWidth={2}
              />
            )}
          </span>
        )}
      </div>

      {!expired && (
        <div className="mt-2.5 grid grid-cols-4 gap-1.5">
          {cells.map((c) => (
            <div
              key={c.label}
              className={cn(
                "flex flex-col items-center gap-1 rounded-sm border py-2 transition",
                urgent
                  ? "border-error/30 bg-error/[0.08]"
                  : "border-white/[0.07] bg-black/25 group-hover:border-white/[0.12]",
              )}
            >
              <span
                className={cn(
                  "font-display text-2xl font-bold tabular-nums leading-none sm:text-[1.7rem]",
                  urgent ? "text-error" : "text-text-primary",
                )}
              >
                {c.value === null ? (
                  "––"
                ) : (
                  <span key={c.value} className="lk-pop inline-block">
                    {String(c.value).padStart(2, "0")}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const blockClass = cn(
    "group relative block rounded-md border p-3 transition",
    urgent
      ? "border-error/40 bg-error/[0.05]"
      : "border-border-subtle bg-white/[0.03]",
    href &&
      (urgent
        ? "hover:border-error/60 hover:bg-error/[0.08]"
        : "hover:border-gold-500/40 hover:bg-white/[0.05]"),
    className,
  );
  // Pin the timezone (America/Toronto, the app default) so the server and
  // client render the same tooltip string — otherwise the title attribute
  // mismatches at hydration.
  const tooltip = new Date(targetAt).toLocaleString(fr ? "fr-CA" : "en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Toronto",
  });

  // role="timer" lives on an inner wrapper, never on the anchor — an explicit
  // role on <a> overrides its implicit `link` role and hides the affordance
  // from the links rotor.
  const timed = (
    <div role="timer" aria-label={ariaLabel} className="contents">
      {inner}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} title={tooltip} className={blockClass}>
        {timed}
      </Link>
    );
  }
  return (
    <div title={tooltip} className={blockClass}>
      {timed}
    </div>
  );
}
