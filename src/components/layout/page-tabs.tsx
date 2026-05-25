"use client";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: LucideIcon;
  /** Optional small badge (e.g. "12/32" or live count). */
  badge?: string | number;
  /** Optional preview text shown under the label when active. */
  hint?: string;
};

/**
 * Standard tab strip used inside connected pages (above the working
 * surface). Two modes:
 *
 *  - `mode="state"`: tab is a piece of local React state. Caller owns
 *    the value + onChange. Use when the page doesn't need to deep-link
 *    the active tab.
 *  - `mode="url"`: tab is reflected as a `?tab=<key>` query param. Use
 *    when you want refresh/share/back to land on the right tab.
 *
 * Sizes follow the same scale as the existing in-page nav so swapping
 * to PageTabs is visually a no-op.
 */
export function PageTabs<T extends string>({
  items,
  active,
  onChange,
  mode = "state",
  searchParam = "tab",
  ariaLabel = "Sections",
  className,
}: {
  items: TabItem<T>[];
  active: T;
  onChange?: (next: T) => void;
  mode?: "state" | "url";
  searchParam?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const router = useRouter();

  function select(key: T) {
    if (mode === "url") {
      const url = new URL(window.location.href);
      if (key === items[0]?.key) url.searchParams.delete(searchParam);
      else url.searchParams.set(searchParam, key);
      window.history.replaceState({}, "", url.toString());
      // Also kick a soft refresh so server components re-fetch with the
      // new search param if they depend on it.
      router.refresh();
    }
    onChange?.(key);
  }

  return (
    <nav
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-[8px] border border-white/[0.1] bg-abyss/[0.55] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => select(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              isActive
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
            )}
          >
            {Icon && <Icon className="size-3.5" strokeWidth={2} />}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[9px] tabular-nums",
                  isActive
                    ? "bg-abyss/25 text-abyss"
                    : "bg-white/[0.07] text-text-tertiary",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
