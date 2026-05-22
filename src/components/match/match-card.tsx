import type { MatchListItem } from "@/lib/matches/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";

export function MatchCard({
  match,
  locale,
}: {
  match: MatchListItem;
  locale: Locale;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

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

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-surface-1/60 p-4 backdrop-blur transition",
        "border-border-subtle hover:border-border-strong hover:bg-surface-2/60",
        isLive && "border-violet-500/40 bg-violet-500/[0.04]",
      )}
    >
      {/* Status badge */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-text-tertiary">
          <StageLabel stage={match.stage} group={match.group_label} locale={locale} />
          {match.venue && (
            <>
              <span aria-hidden>·</span>
              <span>{locale === "fr" ? match.venue.city_fr : match.venue.city_en}</span>
            </>
          )}
        </div>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 font-medium text-violet-400">
            <span className="size-1.5 animate-pulse rounded-full bg-violet-400" />
            LIVE
          </span>
        ) : isFinished ? (
          <span className="rounded-full bg-surface-3 px-2 py-0.5 font-medium text-text-tertiary">
            {locale === "fr" ? "Terminé" : "Final"}
          </span>
        ) : (
          <span className="font-mono tabular-nums text-text-secondary">
            {dateStr} · {timeStr}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2.5">
        <TeamRow
          name={teamLabel(match.home_team, match.home_placeholder, locale)}
          flag={match.home_team?.flag_emoji ?? null}
          score={match.home_score}
          highlight={
            isFinished &&
            match.home_score !== null &&
            match.away_score !== null &&
            match.home_score > match.away_score
          }
          showScore={isLive || isFinished}
        />
        <TeamRow
          name={teamLabel(match.away_team, match.away_placeholder, locale)}
          flag={match.away_team?.flag_emoji ?? null}
          score={match.away_score}
          highlight={
            isFinished &&
            match.home_score !== null &&
            match.away_score !== null &&
            match.away_score > match.home_score
          }
          showScore={isLive || isFinished}
        />
      </div>
    </Link>
  );
}

function TeamRow({
  name,
  flag,
  score,
  highlight,
  showScore,
}: {
  name: string;
  flag: string | null;
  score: number | null;
  highlight: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none" aria-hidden>
          {flag ?? "🏳️"}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            highlight ? "text-text-primary" : "text-text-secondary",
          )}
        >
          {name}
        </span>
      </div>
      {showScore && (
        <span
          className={cn(
            "font-display text-xl font-semibold tabular-nums",
            highlight ? "text-primary-500" : "text-text-secondary",
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
      <span className="font-medium uppercase tracking-wider">
        {locale === "fr" ? "Groupe" : "Group"} {group}
      </span>
    );
  }
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e", en: "Round of 32" },
    r16: { fr: "8e de finale", en: "Round of 16" },
    qf: { fr: "1/4 finale", en: "Quarter-final" },
    sf: { fr: "1/2 finale", en: "Semi-final" },
    third_place: { fr: "3e place", en: "Third place" },
    final: { fr: "Finale", en: "Final" },
  };
  return (
    <span className="font-medium uppercase tracking-wider">
      {labels[stage]?.[locale] ?? stage}
    </span>
  );
}

function teamLabel(
  team: { name_fr: string; name_en: string } | null,
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? "—";
}
