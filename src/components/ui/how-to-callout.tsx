"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HowToStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

type Accent = "gold" | "primary" | "violet";

/**
 * Dismissable "comment ça marche" panel. Stays collapsed on subsequent
 * visits via localStorage, but a small "Aide" link in the header re-opens
 * it for users who want a refresher.
 *
 * Designed to drop on top of a feature page (one per page, not per
 * section) — keep it short, 2-4 steps max.
 */
export function HowToCallout({
  storageKey,
  title,
  subtitle,
  steps,
  accent = "gold",
  showAgainLabel = "Revoir l'aide",
}: {
  /** Unique per surface (e.g. "howto:bracket", "howto:picks"). */
  storageKey: string;
  title: string;
  subtitle?: string;
  steps: HowToStep[];
  accent?: Accent;
  showAgainLabel?: string;
}) {
  // SSR-safe: only read localStorage after mount.
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "dismissed") setDismissed(true);
      if (raw === "collapsed") setCollapsed(true);
    } catch {
      // ignore (private mode etc.)
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "dismissed");
    } catch {
      /* noop */
    }
  }
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(storageKey, next ? "collapsed" : "open");
    } catch {
      /* noop */
    }
  }
  function reopen() {
    setDismissed(false);
    setCollapsed(false);
    try {
      window.localStorage.setItem(storageKey, "open");
    } catch {
      /* noop */
    }
  }

  // Until mount, don't render the dismissed-or-collapsed state to avoid
  // flicker. Render expanded (the most useful default) on first paint.
  const effectiveDismissed = mounted ? dismissed : false;
  const effectiveCollapsed = mounted ? collapsed : false;

  if (effectiveDismissed) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold text-text-tertiary underline-offset-4 transition hover:text-text-primary hover:underline"
      >
        {showAgainLabel}
      </button>
    );
  }

  const accentClasses = {
    gold: {
      border: "border-gold-500/30",
      bg: "bg-gradient-to-br from-gold-500/[0.1] via-primary-500/[0.04] to-transparent",
      chip: "border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold",
      stepBg: "bg-gold-500/[0.06] border-gold-500/20",
      stepIcon: "text-gold-300",
      stepNumber: "text-gold-300/80",
    },
    primary: {
      border: "border-primary-500/30",
      bg: "bg-gradient-to-br from-primary-500/[0.1] via-violet-500/[0.04] to-transparent",
      chip: "border-primary-500/40 bg-primary-500/15 text-primary-300 shadow-glow-primary",
      stepBg: "bg-primary-500/[0.06] border-primary-500/20",
      stepIcon: "text-primary-300",
      stepNumber: "text-primary-300/80",
    },
    violet: {
      border: "border-violet-500/30",
      bg: "bg-gradient-to-br from-violet-500/[0.1] via-primary-500/[0.04] to-transparent",
      chip: "border-violet-500/40 bg-violet-500/15 text-violet-300 shadow-glow-violet",
      stepBg: "bg-violet-500/[0.06] border-violet-500/20",
      stepIcon: "text-violet-300",
      stepNumber: "text-violet-300/80",
    },
  }[accent];

  return (
    <section
      className={cn(
        "relative mb-6 overflow-hidden rounded-[12px] border p-4 backdrop-blur-xl sm:p-5",
        accentClasses.border,
        accentClasses.bg,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cn(
              "mb-1.5 inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              accentClasses.chip,
            )}
          >
            {title}
          </div>
          {subtitle && (
            <p className="text-sm leading-5 text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={effectiveCollapsed ? "Déplier" : "Replier"}
            className="rounded-md p-1 text-text-tertiary transition hover:bg-white/[0.06] hover:text-text-primary"
          >
            {effectiveCollapsed ? (
              <ChevronDown className="size-3.5" strokeWidth={2.5} />
            ) : (
              <ChevronUp className="size-3.5" strokeWidth={2.5} />
            )}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Masquer"
            className="rounded-md p-1 text-text-tertiary transition hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {!effectiveCollapsed && (
        <ol
          className={cn(
            "grid gap-2",
            steps.length === 2 && "sm:grid-cols-2",
            steps.length === 3 && "sm:grid-cols-3",
            steps.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={i}
                className={cn(
                  "rounded-[10px] border p-3",
                  accentClasses.stepBg,
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "font-display text-[10px] font-bold tabular-nums",
                      accentClasses.stepNumber,
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon
                    className={cn("size-4", accentClasses.stepIcon)}
                    strokeWidth={1.8}
                  />
                  <span className="text-sm font-semibold text-text-primary">
                    {step.title}
                  </span>
                </div>
                <p className="text-xs leading-5 text-text-secondary">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
