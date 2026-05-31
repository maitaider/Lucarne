import type { MatchListItem } from "@/lib/matches/queries";
import { Flag } from "@/components/team/flag";
import { Link } from "@/i18n/navigation";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Live + today + recently-finished scores. Server component — the rows
 * are static, so we lean on `revalidate` (or the cron sync that updates
 * ref.matches) to refresh.
 */
export function LiveScores({
  todayMatches,
  recentlyFinished,
  locale,
}: {
  todayMatches: MatchListItem[];
  recentlyFinished: MatchListItem[];
  locale: Locale;
}) {
  const liveNow = todayMatches.filter((m) => m.status === "live");
  const upcomingToday = todayMatches.filter((m) => m.status === "scheduled");
  const finishedToday = todayMatches.filter((m) => m.status === "finished");

  return (
    <div className="space-y-6">
      {liveNow.length > 0 && (
        <Section
          title={locale === "fr" ? "En direct" : "Live now"}
          accent="violet"
          live
        >
          <ul className="grid gap-2 md:grid-cols-2">
            {liveNow.map((m) => (
              <MatchRow key={m.id} match={m} locale={locale} />
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={locale === "fr" ? "Aujourd'hui" : "Today"}
        accent="primary"
      >
        {todayMatches.length === 0 ? (
          <EmptyPanel
            text={
              locale === "fr"
                ? "Aucun match aujourd'hui."
                : "No matches today."
            }
          />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {[...upcomingToday, ...finishedToday].map((m) => (
              <MatchRow key={m.id} match={m} locale={locale} />
            ))}
          </ul>
        )}
      </Section>

      {recentlyFinished.length > 0 && (
        <Section
          title={locale === "fr" ? "Résultats récents" : "Recent results"}
          accent="gold"
        >
          <ul className="grid gap-2 md:grid-cols-2">
            {recentlyFinished.map((m) => (
              <MatchRow key={m.id} match={m} locale={locale} />
            ))}
          </ul>
        </Section>
      )}

      <Link
        href="/matches?view=calendar"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline"
      >
        {locale === "fr" ? "Voir le calendrier complet" : "View full calendar"}{" "}
        →
      </Link>
    </div>
  );
}

function Section({
  title,
  accent,
  live,
  children,
}: {
  title: string;
  accent: "primary" | "gold" | "violet";
  live?: boolean;
  children: React.ReactNode;
}) {
  const tone = {
    primary: "border-primary-500/25 text-primary-300",
    gold: "border-gold-500/30 text-gold-300",
    violet: "border-violet-500/35 text-violet-300",
  }[accent];
  return (
    <section>
      <h2
        className={cn(
          "mb-3 inline-flex items-center gap-2 rounded-[6px] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
          tone,
        )}
      >
        {live && (
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

function MatchRow({
  match,
  locale,
}: {
  match: MatchListItem;
  locale: Locale;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const home =
    match.home_team
      ? locale === "fr"
        ? match.home_team.name_fr
        : match.home_team.name_en
      : (match.home_placeholder ?? "?");
  const away =
    match.away_team
      ? locale === "fr"
        ? match.away_team.name_fr
        : match.away_team.name_en
      : (match.away_placeholder ?? "?");
  const time = new Date(match.kickoff_at).toLocaleTimeString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" },
  );

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className={cn(
          "block rounded-[10px] border bg-surface-1/[0.55] p-3 backdrop-blur-xl transition hover:border-primary-500/30 hover:bg-surface-2/[0.7]",
          isLive
            ? "border-violet-500/45 bg-violet-500/[0.06]"
            : "border-white/[0.08]",
        )}
      >
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className="text-text-tertiary">
            {match.stage === "group"
              ? `${locale === "fr" ? "Groupe" : "Group"} ${match.group_label ?? ""}`
              : stageLabel(match.stage, locale)}
          </span>
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-violet-200">
              <span className="relative flex size-1">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-300 opacity-75" />
                <span className="relative inline-flex size-1 rounded-full bg-violet-300" />
              </span>
              LIVE
            </span>
          ) : isFinished ? (
            <span className="text-text-tertiary">
              {locale === "fr" ? "Terminé" : "Final"}
            </span>
          ) : (
            <span className="font-mono tabular-nums text-text-secondary">
              {time}
            </span>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center justify-end gap-2 text-right">
            <span className="truncate text-sm font-semibold text-text-primary">
              {home}
            </span>
            <Flag isoCode={match.home_team?.iso_code ?? null} size="sm" />
          </div>
          <span
            className={cn(
              "font-display tabular-nums",
              isLive
                ? "text-base font-bold text-violet-300"
                : isFinished
                  ? "text-base font-bold text-text-primary"
                  : "text-xs text-text-tertiary",
            )}
          >
            {isLive || isFinished ? (match.home_score ?? 0) : "—"}
          </span>
          <span className="text-text-tertiary">·</span>
          <span
            className={cn(
              "font-display tabular-nums",
              isLive
                ? "text-base font-bold text-violet-300"
                : isFinished
                  ? "text-base font-bold text-text-primary"
                  : "text-xs text-text-tertiary",
            )}
          >
            {isLive || isFinished ? (match.away_score ?? 0) : "—"}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <Flag isoCode={match.away_team?.iso_code ?? null} size="sm" />
            <span className="truncate text-sm font-semibold text-text-primary">
              {away}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-4 text-center text-xs text-text-secondary backdrop-blur-xl">
      <CalendarClock className="mx-auto mb-2 size-5 text-text-tertiary" />
      {text}
    </div>
  );
}

function stageLabel(stage: string, locale: Locale): string {
  const map: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16ᵉ", en: "R32" },
    r16: { fr: "8ᵉ", en: "R16" },
    qf: { fr: "1/4", en: "QF" },
    sf: { fr: "1/2", en: "SF" },
    third_place: { fr: "3ᵉ place", en: "3rd place" },
    final: { fr: "Finale", en: "Final" },
  };
  return map[stage]?.[locale === "fr" ? "fr" : "en"] ?? stage;
}

