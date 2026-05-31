import type { MatchListItem } from "@/lib/matches/queries";
import { TeamEmblem } from "@/components/team/team-emblem";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { Trophy } from "lucide-react";

type Stage = "r32" | "r16" | "qf" | "sf" | "final";

const stageOrder: Stage[] = ["r32", "r16", "qf", "sf", "final"];

const stageLabels: Record<Stage, { fr: string; en: string }> = {
  r32: { fr: "Seizièmes", en: "Round of 32" },
  r16: { fr: "Huitièmes", en: "Round of 16" },
  qf: { fr: "Quarts", en: "Quarter-finals" },
  sf: { fr: "Demi-finales", en: "Semi-finals" },
  final: { fr: "Finale", en: "Final" },
};

export function Bracket({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  // Bucket matches per stage, ordered by kickoff for stable display
  const byStage = new Map<Stage, MatchListItem[]>();
  for (const s of stageOrder) byStage.set(s, []);
  for (const m of matches) {
    const s = m.stage as Stage;
    if (byStage.has(s)) byStage.get(s)!.push(m);
  }
  for (const list of byStage.values()) {
    list.sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex min-w-full items-stretch gap-4">
        {stageOrder.map((stage, idx) => {
          const list = byStage.get(stage) ?? [];
          if (list.length === 0) {
            return (
              <StageColumn
                key={stage}
                stage={stage}
                locale={locale}
                isLast={idx === stageOrder.length - 1}
              >
                <EmptyStage stage={stage} locale={locale} />
              </StageColumn>
            );
          }
          return (
            <StageColumn
              key={stage}
              stage={stage}
              locale={locale}
              isLast={idx === stageOrder.length - 1}
            >
              <div
                className={cn(
                  "flex flex-col justify-around gap-3 h-full",
                  stage === "final" && "justify-center",
                )}
              >
                {list.map((m) => (
                  <BracketCard key={m.id} match={m} locale={locale} stage={stage} />
                ))}
              </div>
            </StageColumn>
          );
        })}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  locale,
  isLast,
  children,
}: {
  stage: Stage;
  locale: Locale;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const width = stage === "final" ? "w-72" : stage === "sf" ? "w-64" : "w-56";
  return (
    <div className={cn("shrink-0 flex flex-col", width)}>
      <header className="mb-3 flex items-center gap-2">
        {stage === "final" && (
          <Trophy className="size-4 text-gold-400" strokeWidth={2} />
        )}
        <h3
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            stage === "final" ? "text-gold-400" : "text-text-tertiary",
          )}
        >
          {stageLabels[stage][locale]}
        </h3>
        {!isLast && (
          <span className="h-px flex-1 bg-gradient-to-r from-border-subtle to-transparent" />
        )}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyStage({ stage, locale }: { stage: Stage; locale: Locale }) {
  const count: Record<Stage, number> = {
    r32: 16,
    r16: 8,
    qf: 4,
    sf: 2,
    final: 1,
  };
  return (
    <div className="flex h-full flex-col justify-around gap-3">
      {Array.from({ length: count[stage] }).map((_, i) => (
        <div
          key={i}
          className="rounded-sm border border-dashed border-white/[0.1] bg-surface-1/[0.46] py-3 text-center"
        >
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {locale === "fr" ? "À venir" : "TBD"}
          </span>
        </div>
      ))}
    </div>
  );
}

function BracketCard({
  match,
  locale,
  stage,
}: {
  match: MatchListItem;
  locale: Locale;
  stage: Stage;
}) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
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
        "group relative block overflow-hidden rounded-sm border bg-surface-1/[0.68] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur transition",
        "border-white/[0.08] hover:border-primary-500/35 hover:bg-surface-2/[0.78]",
        isLive && "border-violet-500/50 shadow-glow-violet",
        stage === "final" && "border-gold-500/30 bg-gradient-to-br from-gold-500/[0.06] to-transparent",
      )}
    >
      <BracketTeamRow
        team={match.home_team}
        placeholder={match.home_placeholder}
        score={match.home_score}
        showScore={isLive || isFinished}
        winner={homeWon}
        locale={locale}
      />
      <div className="h-px bg-white/[0.08]" />
      <BracketTeamRow
        team={match.away_team}
        placeholder={match.away_placeholder}
        score={match.away_score}
        showScore={isLive || isFinished}
        winner={awayWon}
        locale={locale}
      />
      {isLive && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-300">
          <span className="relative flex size-1">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex size-1 rounded-full bg-violet-400" />
          </span>
          LIVE
        </div>
      )}
    </Link>
  );
}

function BracketTeamRow({
  team,
  placeholder,
  score,
  showScore,
  winner,
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
  winner: boolean;
  locale: Locale;
}) {
  const name = team
    ? locale === "fr"
      ? team.name_fr
      : team.name_en
    : placeholder ?? "—";
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        winner && "bg-primary-500/[0.05]",
      )}
    >
      <TeamEmblem code={team?.fifa_code} name={name} size="sm" />
      <span
        className={cn(
          "flex-1 truncate text-xs",
          winner
            ? "font-bold text-text-primary"
            : team
              ? "font-medium text-text-secondary"
              : "text-text-tertiary",
        )}
      >
        {team?.fifa_code ?? (name.length > 12 ? name.slice(0, 11) + "…" : name)}
      </span>
      {showScore && (
        <span
          className={cn(
            "font-display text-sm font-bold tabular-nums",
            winner ? "text-primary-400" : "text-text-tertiary",
          )}
        >
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}
