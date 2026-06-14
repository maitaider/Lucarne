import type { GroupTable } from "@/lib/matches/group-standings";
import { Flag } from "@/components/team/flag";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function GroupTableCard({
  group,
  locale,
}: {
  group: GroupTable;
  locale: Locale;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-surface-1/[0.64] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.045] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-500/20 to-violet-500/20 font-display text-sm font-bold text-text-primary ring-1 ring-border-subtle">
            {group.group_label}
          </span>
          <span className="font-display text-sm font-semibold text-text-primary">
            {locale === "fr" ? "Groupe" : "Group"} {group.group_label}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "Pts" : "Pts"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
            <th className="px-3 pt-2.5 pb-1.5 text-left font-medium">#</th>
            <th className="pt-2.5 pb-1.5 text-left font-medium">
              {locale === "fr" ? "Équipe" : "Team"}
            </th>
            <th className="pt-2.5 pb-1.5 text-center font-medium">J</th>
            <th className="pt-2.5 pb-1.5 text-center font-medium">G</th>
            <th className="pt-2.5 pb-1.5 text-center font-medium">N</th>
            <th className="pt-2.5 pb-1.5 text-center font-medium">P</th>
            <th className="pt-2.5 pb-1.5 text-center font-medium">+/-</th>
            <th className="px-3 pt-2.5 pb-1.5 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((s, idx) => {
            const rank = idx + 1;
            const qualified = rank <= 2;
            const playoffSpot = rank === 3; // 3rd place can still go through in 48-team format
            return (
              <tr
                key={s.team.id}
                className={cn(
                  "border-t border-white/[0.055] transition hover:bg-white/[0.045]",
                  qualified && "bg-primary-500/[0.04]",
                )}
              >
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                      qualified
                        ? "bg-primary-500/20 text-primary-400"
                        : playoffSpot
                          ? "bg-gold-500/15 text-gold-400"
                          : "bg-surface-3 text-text-tertiary",
                    )}
                  >
                    {rank}
                  </span>
                </td>
                <td className="py-2.5">
                  <Link
                    href={`/teams/${s.team.fifa_code}`}
                    className="group flex items-center gap-2"
                  >
                    <Flag isoCode={s.team.iso_code ?? null} size="md" />
                    <span
                      className={cn(
                        "truncate text-sm font-medium underline-offset-2 transition group-hover:text-primary-200 group-hover:underline",
                        qualified ? "text-text-primary" : "text-text-secondary",
                      )}
                    >
                      {locale === "fr" ? s.team.name_fr : s.team.name_en}
                    </span>
                  </Link>
                </td>
                <td className="text-center font-mono text-xs tabular-nums text-text-tertiary">
                  {s.played}
                </td>
                <td className="text-center font-mono text-xs tabular-nums text-primary-400/80">
                  {s.wins || "—"}
                </td>
                <td className="text-center font-mono text-xs tabular-nums text-text-tertiary">
                  {s.draws || "—"}
                </td>
                <td className="text-center font-mono text-xs tabular-nums text-error/70">
                  {s.losses || "—"}
                </td>
                <td className="text-center font-mono text-xs tabular-nums text-text-secondary">
                  {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff || "—"}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      "font-display text-base font-semibold tabular-nums",
                      qualified ? "text-text-primary" : "text-text-secondary",
                    )}
                  >
                    {s.points}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      {/* Legend */}
      <footer className="flex items-center gap-3 border-t border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] text-text-tertiary">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-primary-400" />
          {locale === "fr" ? "Qualifié" : "Qualified"}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-gold-400" />
          {locale === "fr" ? "Repêchage" : "Playoff"}
        </span>
      </footer>
    </div>
  );
}
