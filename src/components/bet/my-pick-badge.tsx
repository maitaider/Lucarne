import { Check, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { MyPick } from "@/lib/bets/my-picks";

/**
 * Compact pill showing the current user's picks on a match.
 * Designed to overlay or sit next to a MatchCard.
 *
 * State priority:
 *   - any settled won → gold "Gagné +N pts"
 *   - any settled lost → muted "Perdu"
 *   - any active → primary "Pronostic placé · N choix"
 *   - none → nothing rendered
 */
export function MyPickBadge({
  picks,
  locale,
  size = "sm",
}: {
  picks: MyPick[] | undefined;
  locale: Locale;
  size?: "xs" | "sm";
}) {
  if (!picks || picks.length === 0) return null;

  const settledWon = picks.filter(
    (p) => p.status === "settled" && p.result === "won",
  );
  const settledLost = picks.filter(
    (p) => p.status === "settled" && p.result === "lost",
  );
  const active = picks.filter((p) =>
    ["validated", "paid", "pending_payment"].includes(p.status),
  );

  // Won — show total points
  if (settledWon.length > 0) {
    const totalPoints = settledWon.reduce((s, p) => s + p.points, 0);
    return (
      <Pill
        size={size}
        className="border-gold-500/40 bg-gold-500/15 text-gold-300"
        icon={CircleCheck}
        label={
          locale === "fr"
            ? `+${totalPoints} pts`
            : `+${totalPoints} pts`
        }
      />
    );
  }

  // Lost (no wins)
  if (settledLost.length > 0 && active.length === 0) {
    return (
      <Pill
        size={size}
        className="border-white/[0.1] bg-white/[0.04] text-text-tertiary"
        icon={X}
        label={locale === "fr" ? "Pas trouvé" : "Missed"}
      />
    );
  }

  // Active picks — count them
  if (active.length > 0) {
    return (
      <Pill
        size={size}
        className="border-primary-500/40 bg-primary-500/15 text-primary-300"
        icon={Check}
        label={
          locale === "fr"
            ? `Pronostic placé${active.length > 1 ? ` · ${active.length}` : ""}`
            : `Pick placed${active.length > 1 ? ` · ${active.length}` : ""}`
        }
      />
    );
  }

  return null;
}

function Pill({
  icon: Icon,
  label,
  className,
  size,
}: {
  icon: typeof Check;
  label: string;
  className: string;
  size: "xs" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ring-1",
        size === "xs"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <Icon
        className={size === "xs" ? "size-2.5" : "size-3"}
        strokeWidth={2.5}
      />
      {label}
    </span>
  );
}
