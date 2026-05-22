import type { MatchListItem } from "@/lib/matches/queries";
import { Link } from "@/i18n/navigation";
import { TeamEmblem } from "@/components/team/team-emblem";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function MatchCard({
  match,
  locale,
}: {
  match: MatchListItem;
  locale: Locale;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled";

  const kickoff = new Date(match.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  const dateStr = kickoff.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  });

  const homeWon =
    isFinished &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.home_score > match.away_score;
  const awayWon =
    isFinished &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.away_score > match.home_score;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-[8px] border bg-surface-1/[0.68] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition",
        "border-white/[0.08] hover:-translate-y-0.5 hover:border-primary-500/35 hover:bg-surface-2/[0.78] hover:shadow-[0_20px_60px_rgba(0,0,0,0.26)]",
        isLive && "border-violet-500/50 bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] shadow-glow-violet",
      )}
    >
      {/* subtle accent ribbon for live */}
      {isLive && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
        />
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-tertiary">
          <StageLabel stage={match.stage} group={match.group_label} locale={locale} />
          {match.venue && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">
                {locale === "fr" ? match.venue.city_fr : match.venue.city_en}
              </span>
            </>
          )}
        </div>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 font-bold uppercase tracking-wider text-violet-300">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
            </span>
            LIVE
          </span>
        ) : isFinished ? (
          <span className="rounded-[6px] bg-white/[0.05] px-2 py-0.5 font-medium uppercase tracking-wider text-text-tertiary">
            {locale === "fr" ? "Terminé" : "Final"}
          </span>
        ) : (
          <span className="font-mono tabular-nums text-text-secondary">
            {dateStr} · {timeStr}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamLine
          team={match.home_team}
          placeholder={match.home_placeholder}
          score={match.home_score}
          showScore={isLive || isFinished}
          highlight={homeWon}
          locale={locale}
        />
        <TeamLine
          team={match.away_team}
          placeholder={match.away_placeholder}
          score={match.away_score}
          showScore={isLive || isFinished}
          highlight={awayWon}
          locale={locale}
        />
      </div>

      {/* Bet CTA bottom strip (scheduled only, opens QuickBet sheet) */}
      {isScheduled && (
        <QuickBetButton match={match} locale={locale} variant="strip" />
      )}
    </Link>
  );
}

function TeamLine({
  team,
  placeholder,
  score,
  showScore,
  highlight,
  locale,
}: {
  team: {
    iso_code?: string | null;
    name_fr: string;
    name_en: string;
    flag_emoji: string | null;
    fifa_code?: string;
  } | null;
  placeholder: string | null;
  score: number | null;
  showScore: boolean;
  highlight: boolean;
  locale: Locale;
}) {
  const name = team
    ? locale === "fr"
      ? team.name_fr
      : team.name_en
    : placeholder ?? "—";

  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <TeamEmblem code={team?.fifa_code} name={name} size="md" />
        <span
          className={cn(
            "truncate text-sm",
            highlight
              ? "font-bold text-text-primary"
              : team
                ? "font-semibold text-text-secondary"
                : "font-medium text-text-tertiary",
          )}
        >
          {name}
        </span>
      </div>
      {showScore && (
        <span
          className={cn(
            "ml-2 font-display text-2xl font-semibold tabular-nums",
            highlight ? "text-primary-400" : "text-text-secondary",
          )}
        >
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}

function StageLabel({
  stage,
  group,
  locale,
}: {
  stage: string;
  group: string | null;
  locale: Locale;
}) {
  if (stage === "group" && group) {
    return (
      <span className="font-semibold uppercase tracking-wider">
        {locale === "fr" ? "Groupe" : "Group"} {group}
      </span>
    );
  }
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e", en: "R32" },
    r16: { fr: "8e finale", en: "R16" },
    qf: { fr: "1/4 finale", en: "QF" },
    sf: { fr: "1/2 finale", en: "SF" },
    third_place: { fr: "3e place", en: "3rd place" },
    final: { fr: "Finale", en: "Final" },
  };
  return (
    <span className="font-semibold uppercase tracking-wider">
      {labels[stage]?.[locale] ?? stage}
    </span>
  );
}
