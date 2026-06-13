import { TrendingUp, TrendingDown, Flame, Activity } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import type {
  DailyMovement,
  DailyMovements as Movements,
} from "@/lib/leagues/standings-history";
import type { Locale } from "@/i18n/routing";

/**
 * "Today's movers" strip at the top of the leaderboard: biggest climb, biggest
 * drop, best scorer over the last 24h. Hidden until there's at least one move
 * (i.e. once a second daily snapshot exists).
 */
export function DailyMovements({
  movements,
  locale,
}: {
  movements: Movements;
  locale: Locale;
}) {
  const fr = locale === "fr";
  if (!movements.climb && !movements.drop && !movements.scorer) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2.5 flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wider text-text-secondary">
        <Activity className="size-4 text-primary-400" strokeWidth={2} />
        {fr ? "Mouvements du jour" : "Today's movers"}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {movements.climb && (
          <MovementCard kind="climb" m={movements.climb} fr={fr} />
        )}
        {movements.drop && (
          <MovementCard kind="drop" m={movements.drop} fr={fr} />
        )}
        {movements.scorer && (
          <MovementCard kind="scorer" m={movements.scorer} fr={fr} />
        )}
      </div>
    </section>
  );
}

function MovementCard({
  kind,
  m,
  fr,
}: {
  kind: "climb" | "drop" | "scorer";
  m: DailyMovement;
  fr: boolean;
}) {
  const cfg = {
    climb: {
      icon: TrendingUp,
      tint: "border-primary-500/30 bg-primary-500/[0.07] text-primary-300",
      label: fr ? "Plus forte montée" : "Biggest climb",
      value: `+${m.value}`,
      unit: fr ? (m.value > 1 ? "places" : "place") : m.value > 1 ? "spots" : "spot",
    },
    drop: {
      icon: TrendingDown,
      tint: "border-error/30 bg-error/[0.06] text-error",
      label: fr ? "Plus forte chute" : "Biggest drop",
      value: `−${Math.abs(m.value)}`,
      unit: fr
        ? Math.abs(m.value) > 1
          ? "places"
          : "place"
        : Math.abs(m.value) > 1
          ? "spots"
          : "spot",
    },
    scorer: {
      icon: Flame,
      tint: "border-gold-500/35 bg-gold-500/[0.08] text-gold-300",
      label: fr ? "Meilleur pointeur · 24 h" : "Top scorer · 24h",
      value: `+${m.value}`,
      unit: "pts",
    },
  }[kind];
  const Icon = cfg.icon;

  return (
    <Link
      href={`/u/${m.username}`}
      className={cn(
        "group flex items-center gap-3 rounded-md border px-3.5 py-3 backdrop-blur-md transition hover:-translate-y-0.5",
        cfg.tint,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-abyss/30 ring-1 ring-inset ring-white/10">
        <Icon className="size-4.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
          {cfg.label}
        </div>
        <div className="flex items-center gap-1.5">
          <UserAvatar
            src={m.avatarUrl}
            name={m.displayName ?? m.username}
            className="size-4 ring-1 ring-white/15"
            fallbackClassName="bg-white/10 font-mono text-[7px] font-bold text-text-primary"
          />
          <span className="truncate text-sm font-semibold text-text-primary group-hover:underline">
            @{m.username}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-lg font-bold tabular-nums leading-none">
          {cfg.value}
        </div>
        <div className="text-[9px] font-medium uppercase tracking-wider opacity-70">
          {cfg.unit}
        </div>
      </div>
    </Link>
  );
}
