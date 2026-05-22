import type { StandingEntry } from "@/lib/leagues/queries";
import { cn } from "@/lib/utils";

export function StandingsTable({
  entries,
  highlightUserId,
  locale,
}: {
  entries: StandingEntry[];
  highlightUserId?: string | null;
  locale: "fr" | "en";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-1/40 backdrop-blur">
      <table className="w-full">
        <thead className="border-b border-border-subtle bg-surface-2/50 text-left text-xs uppercase tracking-wider text-text-tertiary">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-2 py-3 font-medium">{locale === "fr" ? "Joueur" : "Player"}</th>
            <th className="px-2 py-3 text-right font-medium tabular-nums">
              {locale === "fr" ? "Points" : "Points"}
            </th>
            <th className="hidden px-2 py-3 text-right font-medium tabular-nums sm:table-cell">
              {locale === "fr" ? "V" : "W"}
            </th>
            <th className="hidden px-2 py-3 text-right font-medium tabular-nums sm:table-cell">
              {locale === "fr" ? "D" : "L"}
            </th>
            <th className="hidden px-4 py-3 text-right font-medium tabular-nums sm:table-cell">
              {locale === "fr" ? "Paris" : "Bets"}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {entries.map((e) => (
            <tr
              key={e.user_id}
              className={cn(
                "transition hover:bg-surface-2/30",
                highlightUserId === e.user_id && "bg-primary-500/[0.05] ring-1 ring-inset ring-primary-500/20",
              )}
            >
              <td className="px-4 py-3">
                <RankBadge rank={e.rank} />
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-text-secondary">
                    {e.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      @{e.username}
                    </div>
                    {e.display_name && (
                      <div className="text-xs text-text-tertiary">
                        {e.display_name}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-2 py-3 text-right font-display font-semibold tabular-nums text-text-primary">
                {e.total_points}
              </td>
              <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-primary-500 sm:table-cell">
                {e.wins}
              </td>
              <td className="hidden px-2 py-3 text-right font-mono tabular-nums text-text-tertiary sm:table-cell">
                {e.losses}
              </td>
              <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-text-secondary sm:table-cell">
                {e.bets_count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="font-display text-lg font-bold tabular-nums text-gold-400">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="font-display text-base font-semibold tabular-nums text-text-secondary">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="font-display text-base font-semibold tabular-nums text-amber-600">
        3
      </span>
    );
  return (
    <span className="font-mono text-sm tabular-nums text-text-tertiary">{rank}</span>
  );
}
