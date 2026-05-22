import type { StandingEntry } from "@/lib/leagues/queries";
import { Crown, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeaderboardPodium({ top3 }: { top3: StandingEntry[] }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-surface-1/80 via-surface-1/40 to-surface-2/60 p-6 backdrop-blur sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-3xl"
      />
      <div className="relative grid grid-cols-3 items-end gap-3 sm:gap-6">
        <Step entry={second} rank={2} />
        <Step entry={first} rank={1} />
        <Step entry={third} rank={3} />
      </div>
    </div>
  );
}

function Step({
  entry,
  rank,
}: {
  entry: StandingEntry | undefined;
  rank: 1 | 2 | 3;
}) {
  if (!entry) {
    return (
      <div className="flex flex-col items-center text-text-tertiary">
        <div className="size-16 rounded-full bg-surface-3 ring-1 ring-border-subtle" />
        <span className="mt-2 text-xs">—</span>
      </div>
    );
  }

  const initials = (entry.display_name ?? entry.username)
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const config = {
    1: {
      avatarSize: "size-20 sm:size-24",
      avatarRing: "ring-4 ring-gold-500/40 shadow-glow-gold",
      avatarBg: "from-gold-500/40 to-gold-500/10",
      icon: (
        <Crown className="absolute -top-3 left-1/2 size-7 -translate-x-1/2 fill-gold-400 text-gold-400 drop-shadow-[0_0_8px_rgba(245,196,71,0.8)]" />
      ),
      podiumH: "h-32 sm:h-36",
      podiumGrad:
        "from-gold-500/30 via-gold-500/15 to-transparent border-gold-500/40",
      podiumText: "text-gold-400",
      rankLabel: "1ᵉʳ",
      name: "text-text-primary font-bold",
    },
    2: {
      avatarSize: "size-16 sm:size-20",
      avatarRing: "ring-2 ring-text-secondary/40",
      avatarBg: "from-text-secondary/30 to-text-tertiary/10",
      icon: (
        <Trophy
          className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 text-text-secondary"
          strokeWidth={1.5}
        />
      ),
      podiumH: "h-24 sm:h-28",
      podiumGrad:
        "from-text-secondary/25 via-text-secondary/10 to-transparent border-text-secondary/30",
      podiumText: "text-text-secondary",
      rankLabel: "2ᵉ",
      name: "text-text-primary font-semibold",
    },
    3: {
      avatarSize: "size-14 sm:size-16",
      avatarRing: "ring-2 ring-amber-700/40",
      avatarBg: "from-amber-700/30 to-amber-700/5",
      icon: (
        <Medal
          className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 text-amber-600"
          strokeWidth={1.5}
        />
      ),
      podiumH: "h-20 sm:h-24",
      podiumGrad:
        "from-amber-700/25 via-amber-700/10 to-transparent border-amber-700/30",
      podiumText: "text-amber-500",
      rankLabel: "3ᵉ",
      name: "text-text-secondary font-medium",
    },
  }[rank];

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-3">
        {config.icon}
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-display font-bold uppercase text-text-primary",
            config.avatarSize,
            config.avatarBg,
            config.avatarRing,
          )}
        >
          <span
            className={rank === 1 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}
          >
            {initials}
          </span>
        </div>
      </div>

      <div className="mb-3 max-w-full text-center">
        <div className={cn("truncate text-sm sm:text-base", config.name)}>
          @{entry.username}
        </div>
        <div
          className={cn(
            "font-display tabular-nums",
            rank === 1 ? "text-2xl font-bold sm:text-3xl" : "text-lg font-semibold",
            config.podiumText,
          )}
        >
          {entry.total_points}
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            pts
          </span>
        </div>
      </div>

      <div
        className={cn(
          "w-full rounded-t-2xl border bg-gradient-to-t",
          config.podiumH,
          config.podiumGrad,
        )}
      >
        <div className="flex h-full items-center justify-center">
          <span
            className={cn(
              "font-display font-extrabold tabular-nums",
              rank === 1 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
              config.podiumText,
            )}
          >
            {config.rankLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
