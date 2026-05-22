import type { StandingEntry } from "@/lib/leagues/queries";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function LeaderboardPodium({ top3 }: { top3: StandingEntry[] }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];
  return (
    <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
      <Step entry={second} rank={2} heightClass="h-28" />
      <Step entry={first} rank={1} heightClass="h-40" />
      <Step entry={third} rank={3} heightClass="h-20" />
    </div>
  );
}

function Step({
  entry,
  rank,
  heightClass,
}: {
  entry: StandingEntry | undefined;
  rank: 1 | 2 | 3;
  heightClass: string;
}) {
  const color =
    rank === 1
      ? "from-gold-500/30 to-gold-500/5 border-gold-500/40 text-gold-400"
      : rank === 2
        ? "from-text-secondary/20 to-text-tertiary/5 border-text-tertiary/30 text-text-secondary"
        : "from-amber-700/20 to-amber-700/5 border-amber-700/30 text-amber-500";

  return (
    <div className="flex flex-col items-center gap-3">
      {entry ? (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full text-2xl shadow-glow-gold/40",
              rank === 1
                ? "bg-gold-500/15 ring-2 ring-gold-500/50"
                : rank === 2
                  ? "bg-surface-3 ring-2 ring-border-strong"
                  : "bg-amber-700/15 ring-2 ring-amber-700/40",
            )}
          >
            {rank === 1 ? <Trophy className="size-6 text-gold-400" /> : null}
            {rank !== 1 && (
              <span className="font-display text-xl font-semibold text-text-primary">
                {entry.username.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-2 max-w-full truncate text-sm font-semibold text-text-primary">
            @{entry.username}
          </div>
          <div className="font-mono text-xs tabular-nums text-text-tertiary">
            {entry.total_points} pts
          </div>
        </div>
      ) : (
        <div className="text-xs text-text-tertiary">—</div>
      )}
      <div
        className={cn(
          "w-full rounded-t-xl border bg-gradient-to-t",
          color,
          heightClass,
        )}
      >
        <div className="flex h-full items-start justify-center pt-2 font-display text-2xl font-bold">
          {rank}
        </div>
      </div>
    </div>
  );
}
