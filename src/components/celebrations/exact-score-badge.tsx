import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Persistent gold badge marking an exact-score prediction (the +13 / trophy
 * moment). Reusable across the match sheet, public profile, and bet history.
 */
export function ExactScoreBadge({
  locale,
  size = "sm",
  className,
}: {
  locale: Locale;
  size?: "xs" | "sm";
  className?: string;
}) {
  const fr = locale === "fr";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/15 font-bold uppercase tracking-wider text-gold-300",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
      title={fr ? "Score exact" : "Exact score"}
    >
      <Trophy
        className={size === "xs" ? "size-2.5" : "size-3"}
        strokeWidth={2.5}
      />
      {fr ? "Score exact" : "Exact score"}
    </span>
  );
}
