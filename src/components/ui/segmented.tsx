import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type SegmentItem<T extends string> = {
  key: T;
  label: string;
  icon?: LucideIcon;
  /** Small trailing count, e.g. "3/12". */
  badge?: string | number;
};

/**
 * The one segmented control for the app — unifies the old PageTabs pill
 * and the predict-board SegmentSwitcher. Controlled (value + onChange),
 * no internal hooks, so it's usable from any tree.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  size = "md",
  fullWidth = false,
  ariaLabel = "Sections",
  className,
}: {
  items: SegmentItem<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-sm border border-border-strong/50 bg-abyss/60 p-1",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[7px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
              fullWidth && "flex-1",
              isActive
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
            )}
          >
            {Icon && <Icon className="size-3.5" strokeWidth={2} />}
            {item.label}
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
    </div>
  );
}
