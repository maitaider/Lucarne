import { ReactionBar } from "@/components/social/reaction-bar";
import { getReactionsForTargets } from "@/lib/social/queries";
import {
  Activity,
  CheckCircle2,
  Receipt,
  Trophy,
  X,
} from "lucide-react";
import type { FeedActivity } from "@/lib/social/feed";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export async function LeagueActivityFeed({
  activities,
  locale,
}: {
  activities: FeedActivity[];
  locale: Locale;
}) {
  const betIds = Array.from(
    new Set(activities.map((a) => a.bet?.id).filter(Boolean) as string[]),
  );
  const reactions = await getReactionsForTargets("bet", betIds);

  return (
    <section className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
          <Activity className="size-4 text-primary-400" strokeWidth={1.7} />
          {locale === "fr" ? "Activité de la ligue" : "League activity"}
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {activities.length} {locale === "fr" ? "événements" : "events"}
        </span>
      </header>

      {activities.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.1] p-6 text-center text-sm text-text-secondary">
          {locale === "fr"
            ? "Aucune activité pour le moment. Les paris validés des membres apparaîtront ici dès le coup d'envoi."
            : "No activity yet. Members' validated bets will appear here at kickoff."}
        </div>
      ) : (
        <ul className="space-y-3">
          {activities.map((act) => {
            const summary =
              act.bet?.id != null
                ? reactions.get(act.bet.id)
                : undefined;
            return (
              <li
                key={act.id}
                className={cn(
                  "rounded-[10px] border bg-white/[0.04] p-4 backdrop-blur-xl transition hover:bg-white/[0.06]",
                  act.kind === "bet_won"
                    ? "border-primary-500/30 bg-primary-500/[0.06]"
                    : act.kind === "bet_lost"
                      ? "border-error/20"
                      : "border-white/[0.08]",
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <ActivityIcon kind={act.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5 text-text-primary">
                      <span className="font-semibold">
                        {act.user.display_name ?? `@${act.user.username}`}
                      </span>{" "}
                      <span className="text-text-secondary">
                        {summarize(act, locale)}
                      </span>
                    </p>
                    {act.bet && (
                      <p className="mt-1 text-xs text-text-tertiary">
                        {act.bet.home_team ?? "?"} – {act.bet.away_team ?? "?"}
                        {act.kind === "bet_won" && act.bet.points > 0 && (
                          <span className="ml-1 font-semibold text-primary-400">
                            · +{act.bet.points} pts
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <time
                    dateTime={act.created_at}
                    className="font-mono text-[10px] tabular-nums text-text-tertiary"
                  >
                    {formatRelative(act.created_at, locale)}
                  </time>
                </div>

                {act.bet && summary && (
                  <div className="mt-3 border-t border-white/[0.05] pt-2">
                    <ReactionBar
                      targetType="bet"
                      targetId={act.bet.id}
                      initialCounts={summary.counts}
                      initialMine={summary.mine}
                      size="sm"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ActivityIcon({ kind }: { kind: FeedActivity["kind"] }) {
  const config = {
    bet_placed: {
      Icon: Receipt,
      bg: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    },
    bet_won: {
      Icon: Trophy,
      bg: "bg-primary-500/15 text-primary-300 ring-primary-500/30",
    },
    bet_lost: {
      Icon: X,
      bg: "bg-error/15 text-error ring-error/30",
    },
    match_finished: {
      Icon: CheckCircle2,
      bg: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
    },
  }[kind];
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
        config.bg,
      )}
    >
      <Icon className="size-4" strokeWidth={1.7} />
    </span>
  );
}

function summarize(act: FeedActivity, locale: Locale): string {
  if (act.kind === "bet_placed") {
    return locale === "fr"
      ? "a validé un pronostic"
      : "validated a prediction";
  }
  if (act.kind === "bet_won") {
    return locale === "fr"
      ? "a gagné son pronostic 🎉"
      : "won the prediction 🎉";
  }
  if (act.kind === "bet_lost") {
    return locale === "fr"
      ? "a perdu son pronostic"
      : "lost the prediction";
  }
  return "";
}

function formatRelative(iso: string, locale: Locale): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60_000);
  const hr = Math.round(diff / 3_600_000);
  const day = Math.round(diff / 86_400_000);
  if (min < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (min < 60) return locale === "fr" ? `${min} min` : `${min}m`;
  if (hr < 24) return locale === "fr" ? `${hr} h` : `${hr}h`;
  if (day < 7) return locale === "fr" ? `${day} j` : `${day}d`;
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
  });
}

