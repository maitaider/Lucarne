import type { StandingEntry } from "@/lib/leagues/queries";
import { TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FlashRow } from "./flash-row";

export function StandingsTable({
  entries,
  highlightUserId,
  locale,
}: {
  entries: StandingEntry[];
  highlightUserId?: string | null;
  locale: "fr" | "en";
}) {
  const maxPoints = Math.max(...entries.map((e) => e.total_points), 1);

  return (
    <div className="overflow-hidden rounded-[8px] border border-white/[0.08] bg-surface-1/[0.64] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <table className="w-full">
        <thead className="border-b border-white/[0.08] bg-white/[0.045]">
          <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
            <th className="px-4 py-3 text-left font-bold">#</th>
            <th className="py-3 text-left font-bold">
              {locale === "fr" ? "Joueur" : "Player"}
            </th>
            <th className="hidden py-3 pr-3 text-center font-bold sm:table-cell">
              {locale === "fr" ? "V/N/D" : "W/D/L"}
            </th>
            <th className="hidden py-3 pr-3 text-center font-bold md:table-cell">
              {locale === "fr" ? "Paris" : "Bets"}
            </th>
            <th className="hidden py-3 pr-3 text-left font-bold lg:table-cell">
              {locale === "fr" ? "Forme" : "Form"}
            </th>
            <th className="px-4 py-3 text-right font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {entries.map((e) => {
            const isMe = highlightUserId === e.user_id;
            const isAdmin = e.role === "admin" || e.role === "super_admin";
            const winRate = e.bets_count > 0 ? e.wins / e.bets_count : 0;
            const barWidth = (e.total_points / maxPoints) * 100;
            const draws = Math.max(e.bets_count - e.wins - e.losses, 0);
            return (
              <FlashRow
                as="tr"
                key={e.user_id}
                points={e.total_points}
                className={cn(
                  "group transition hover:bg-white/[0.045]",
                  isAdmin &&
                    !isMe &&
                    "bg-gold-500/[0.06] ring-1 ring-inset ring-gold-500/25",
                  isMe &&
                    "bg-primary-500/[0.06] ring-1 ring-inset ring-primary-500/30",
                )}
              >
                <td className="w-12 px-4 py-3">
                  <RankBadge rank={e.rank} />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      src={e.avatar_url}
                      name={e.display_name ?? e.username}
                      className={cn(
                        "size-8 ring-1",
                        e.rank === 1
                          ? "ring-gold-500/30"
                          : e.rank === 2
                            ? "ring-text-secondary/30"
                            : e.rank === 3
                              ? "ring-amber-700/30"
                              : "ring-border-subtle",
                      )}
                      fallbackClassName={cn(
                        "bg-gradient-to-br font-mono text-[10px] font-bold",
                        e.rank === 1
                          ? "from-gold-500/30 to-gold-500/10 text-gold-100"
                          : e.rank === 2
                            ? "from-text-secondary/30 to-text-tertiary/10 text-text-primary"
                            : e.rank === 3
                              ? "from-amber-700/30 to-amber-700/10 text-amber-100"
                              : "from-primary-500/20 to-violet-500/15 text-text-primary",
                      )}
                    />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "truncate text-sm font-semibold",
                          isMe ? "text-primary-400" : "text-text-primary",
                        )}
                      >
                        <Link
                          href={`/u/${e.username}`}
                          className="transition hover:text-primary-400 hover:underline"
                        >
                          @{e.username}
                        </Link>
                        {isMe && (
                          <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-400">
                            {locale === "fr" ? "Toi" : "You"}
                          </span>
                        )}
                        {isAdmin && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-gold-500/15 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-500/30">
                            <ShieldCheck className="size-2.5" strokeWidth={2.5} />
                            Admin
                          </span>
                        )}
                      </div>
                      {e.display_name && (
                        <div className="truncate text-xs text-text-tertiary">
                          {e.display_name}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="hidden py-3 pr-3 sm:table-cell">
                  <div className="flex items-center justify-center gap-1 font-mono text-xs tabular-nums">
                    <span className="text-primary-400">{e.wins}</span>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-text-tertiary">{draws}</span>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-error/70">{e.losses}</span>
                  </div>
                </td>
                <td className="hidden py-3 pr-3 text-center md:table-cell">
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    {e.bets_count}
                  </span>
                </td>
                <td className="hidden w-32 py-3 pr-3 lg:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width]",
                          winRate >= 0.5
                            ? "bg-primary-500"
                            : winRate >= 0.3
                              ? "bg-gold-500"
                              : "bg-text-tertiary",
                        )}
                        style={{ width: `${Math.max(barWidth, 4)}%` }}
                      />
                    </div>
                    <FormIcon wins={e.wins} losses={e.losses} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      "font-display text-base font-bold tabular-nums",
                      e.rank === 1 ? "text-gold-400" : "text-text-primary",
                    )}
                  >
                    {e.total_points}
                  </span>
                </td>
              </FlashRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/15 ring-1 ring-gold-500/30">
        <span className="font-display text-base font-extrabold tabular-nums text-gold-400">
          1
        </span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex size-8 items-center justify-center rounded-lg bg-surface-3 ring-1 ring-border-strong">
        <span className="font-display text-base font-bold tabular-nums text-text-secondary">
          2
        </span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex size-8 items-center justify-center rounded-lg bg-amber-700/15 ring-1 ring-amber-700/30">
        <span className="font-display text-base font-bold tabular-nums text-amber-500">
          3
        </span>
      </div>
    );
  }
  return (
    <span className="font-mono text-sm tabular-nums text-text-tertiary">
      #{rank}
    </span>
  );
}

function FormIcon({ wins, losses }: { wins: number; losses: number }) {
  if (wins > losses) {
    return <TrendingUp className="size-3.5 text-primary-400" strokeWidth={2} />;
  }
  if (losses > wins) {
    return <TrendingDown className="size-3.5 text-error/70" strokeWidth={2} />;
  }
  return <Minus className="size-3.5 text-text-tertiary" strokeWidth={2} />;
}
