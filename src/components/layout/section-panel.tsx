import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Accent = "primary" | "gold" | "violet" | "neutral";

const ACCENT: Record<Accent, { border: string; bg: string; chip: string }> = {
  primary: {
    border: "border-border-subtle",
    bg: "bg-surface-1",
    chip: "bg-primary-500/12 text-primary-300",
  },
  gold: {
    border: "border-gold-500/30",
    bg: "bg-gradient-to-br from-gold-500/[0.08] via-surface-1 to-surface-1",
    chip: "bg-gold-500/15 text-gold-300",
  },
  violet: {
    border: "border-violet-500/25",
    bg: "bg-gradient-to-br from-violet-500/[0.08] via-surface-1 to-surface-1",
    chip: "bg-violet-500/15 text-violet-300",
  },
  neutral: {
    border: "border-border-subtle",
    bg: "bg-surface-1",
    chip: "bg-white/[0.06] text-text-tertiary",
  },
};

/**
 * Standard "card" surface for any block of content under a hero.
 *
 * Renders an optional header row (icon + title + optional badge + optional
 * right-aligned actions), then the children as the working surface.
 *
 * Always use this for content panels — it enforces consistent radius
 * (rounded-sm), border weight, and padding scale. Avoid card-in-card
 * by nesting raw divs inside instead of another SectionPanel.
 */
export function SectionPanel({
  title,
  icon: Icon,
  badge,
  actions,
  accent = "primary",
  description,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  accent?: Accent;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Set false when children draw their own padding (e.g. a divided list). */
  padded?: boolean;
}) {
  const tone = ACCENT[accent];
  return (
    <section
      className={cn(
        "rounded-sm border backdrop-blur-xl",
        tone.border,
        tone.bg,
        className,
      )}
    >
      {(title || actions) && (
        <header
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-3",
            !padded && "border-b-0 pb-2",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-xs",
                  tone.chip,
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.7} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold text-text-primary sm:text-base">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 truncate text-xs text-text-tertiary">
                  {description}
                </p>
              )}
            </div>
            {badge !== undefined && badge !== null && (
              <span className="ml-1 rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
                {badge}
              </span>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
