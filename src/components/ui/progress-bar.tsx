import { cn } from "@/lib/utils";

type Accent = "primary" | "gold" | "violet";

const FILL: Record<Accent, string> = {
  primary: "from-primary-500 to-primary-400",
  gold: "from-gold-500 to-gold-400",
  violet: "from-violet-500 to-violet-400",
};

/**
 * Labeled progress bar. Replaces the inline progress markup scattered
 * across the dashboard launch cards and the predict control strip.
 */
export function ProgressBar({
  value,
  max,
  label,
  accent = "primary",
  showCount = true,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  accent?: Accent;
  showCount?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.round((Math.min(value, max) / max) * 100) : 0;
  return (
    <div className={className}>
      {(label || showCount) && (
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label ? <span className="truncate">{label}</span> : <span />}
          {showCount && (
            <span className="font-mono tabular-nums text-text-secondary">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
            FILL[accent],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
