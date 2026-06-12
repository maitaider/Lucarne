import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Rank movement vs the last daily snapshot. Accessible by design: a direction
 * icon (▲ ▼ =) + the signed number + an aria-label — never colour alone.
 */
export function RankDelta({
  delta,
  locale,
  className,
}: {
  delta: number | null;
  locale: Locale;
  className?: string;
}) {
  const fr = locale === "fr";

  if (delta === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-text-tertiary",
          className,
        )}
        title={fr ? "Nouveau au classement" : "New on the board"}
      >
        {fr ? "Nouv." : "New"}
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span
        className={cn("inline-flex items-center text-text-tertiary", className)}
        aria-label={fr ? "Rang stable" : "Unchanged"}
        title={fr ? "Stable depuis hier" : "Unchanged since yesterday"}
      >
        <Minus className="size-3" strokeWidth={2.5} />
      </span>
    );
  }

  const up = delta > 0;
  const n = Math.abs(delta);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs font-bold tabular-nums",
        up ? "text-primary-400" : "text-error",
        className,
      )}
      aria-label={
        fr
          ? `${up ? "Monte de" : "Descend de"} ${n} ${n > 1 ? "places" : "place"}`
          : `${up ? "Up" : "Down"} ${n}`
      }
      title={
        fr
          ? `${up ? "+" : "−"}${n} depuis hier`
          : `${up ? "+" : "−"}${n} since yesterday`
      }
    >
      {up ? (
        <ChevronUp className="size-3.5" strokeWidth={3} />
      ) : (
        <ChevronDown className="size-3.5" strokeWidth={3} />
      )}
      {n}
    </span>
  );
}
