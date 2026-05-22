import { setRequestLocale } from "next-intl/server";
import { listMatches, groupMatchesByDate } from "@/lib/matches/queries";
import { getGroupStandings } from "@/lib/matches/group-standings";
import { MatchCard } from "@/components/match/match-card";
import { GroupTableCard } from "@/components/match/group-table";
import { Bracket } from "@/components/match/bracket";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { CalendarDays, LayoutGrid, Trophy } from "lucide-react";

type View = "groups" | "calendar" | "knockout";

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string; stage?: string; group?: string }>;
}) {
  const { locale } = await params;
  const { view, stage, group } = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const currentView: View =
    view === "calendar" ? "calendar" : view === "knockout" ? "knockout" : "groups";

  const [allMatches, groups] = await Promise.all([
    listMatches(),
    currentView === "groups" ? getGroupStandings() : Promise.resolve([]),
  ]);

  const liveCount = allMatches.filter((m) => m.status === "live").length;
  const finishedCount = allMatches.filter((m) => m.status === "finished").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with tournament summary */}
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400 ring-1 ring-gold-500/20">
              <Trophy className="size-3" />
              {L === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-text-primary">
              {L === "fr" ? "Le Mondial" : "The Tournament"}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {L === "fr"
                ? `48 équipes · ${allMatches.length} matchs · ${finishedCount} joués${liveCount > 0 ? ` · ${liveCount} en direct` : ""}`
                : `48 teams · ${allMatches.length} matches · ${finishedCount} played${liveCount > 0 ? ` · ${liveCount} live` : ""}`}
            </p>
          </div>

          {liveCount > 0 && (
            <Link
              href="/matches?view=calendar"
              className="flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/15"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-violet-400" />
              </span>
              {liveCount} {L === "fr" ? "en direct" : "live now"}
            </Link>
          )}
        </div>
      </header>

      {/* Tabs */}
      <ViewTabs current={currentView} locale={L} />

      {currentView === "groups" && (
        <section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <GroupTableCard key={g.group_label} group={g} locale={L} />
            ))}
          </div>
        </section>
      )}

      {currentView === "calendar" && (
        <CalendarView matches={allMatches} stage={stage} group={group} locale={L} />
      )}

      {currentView === "knockout" && (
        <KnockoutView matches={allMatches} locale={L} />
      )}
    </main>
  );
}

function ViewTabs({ current, locale }: { current: View; locale: Locale }) {
  const tabs: { id: View; fr: string; en: string; icon: typeof LayoutGrid }[] = [
    { id: "groups", fr: "Groupes", en: "Groups", icon: LayoutGrid },
    { id: "calendar", fr: "Calendrier", en: "Calendar", icon: CalendarDays },
    { id: "knockout", fr: "Phase finale", en: "Knockout", icon: Trophy },
  ];

  return (
    <div className="mb-6 inline-flex rounded-full border border-border-subtle bg-surface-1/60 p-1 backdrop-blur">
      {tabs.map((t) => {
        const isActive = t.id === current;
        const Icon = t.icon;
        const href = t.id === "groups" ? "/matches" : `/matches?view=${t.id}`;
        return (
          <Link
            key={t.id}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              isActive
                ? "bg-primary-500 text-base shadow-glow-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2} />
            {locale === "fr" ? t.fr : t.en}
          </Link>
        );
      })}
    </div>
  );
}

function CalendarView({
  matches,
  stage,
  group,
  locale,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  stage?: string;
  group?: string;
  locale: Locale;
}) {
  let filtered = matches;
  if (stage && stage !== "all") filtered = filtered.filter((m) => m.stage === stage);
  if (group) filtered = filtered.filter((m) => m.group_label === group);

  const grouped = groupMatchesByDate(filtered);
  const dateKeys = Array.from(grouped.keys()).sort();

  return (
    <>
      <StageFilter activeStage={stage} locale={locale} />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-1/40 p-10 text-center">
          <p className="text-text-secondary">
            {locale === "fr" ? "Aucun match dans cette catégorie." : "No matches here."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateKeys.map((date) => (
            <section key={date}>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-tertiary">
                <span className="h-px flex-1 bg-border-subtle" />
                <span>{formatDateHeader(date, locale)}</span>
                <span className="h-px flex-1 bg-border-subtle" />
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.get(date)!.map((m) => (
                  <MatchCard key={m.id} match={m} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function StageFilter({
  activeStage,
  locale,
}: {
  activeStage?: string;
  locale: Locale;
}) {
  const stages = [
    { key: "all", fr: "Tous", en: "All" },
    { key: "group", fr: "Groupes", en: "Group" },
    { key: "r32", fr: "1/16e", en: "R32" },
    { key: "r16", fr: "8e", en: "R16" },
    { key: "qf", fr: "1/4", en: "QF" },
    { key: "sf", fr: "1/2", en: "SF" },
    { key: "final", fr: "Finale", en: "Final" },
  ];
  const active = activeStage ?? "all";

  return (
    <div className="mb-6 flex flex-wrap gap-1.5">
      {stages.map((s) => {
        const isActive = s.key === active;
        const href = `/matches?view=calendar${s.key === "all" ? "" : `&stage=${s.key}`}`;
        return (
          <Link
            key={s.key}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition",
              isActive
                ? "bg-text-primary text-base"
                : "border border-border-subtle bg-surface-1/40 text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            {locale === "fr" ? s.fr : s.en}
          </Link>
        );
      })}
    </div>
  );
}

function KnockoutView({
  matches,
  locale,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  locale: Locale;
}) {
  const knockoutMatches = matches.filter(
    (m) => m.stage !== "group" && m.stage !== "third_place",
  );
  const thirdPlace = matches.filter((m) => m.stage === "third_place");

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold tracking-tight text-text-primary">
            {locale === "fr" ? "Arbre de la phase finale" : "Tournament bracket"}
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            ← {locale === "fr" ? "scrolle" : "scroll"} →
          </span>
        </div>
        <Bracket matches={knockoutMatches} locale={locale} />
      </section>

      {thirdPlace.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold tracking-tight text-text-primary">
            <Trophy className="size-4 text-amber-500" strokeWidth={1.5} />
            {locale === "fr" ? "Match pour la 3ᵉ place" : "Third place playoff"}
          </h2>
          <div className="max-w-md">
            {thirdPlace.map((m) => (
              <MatchCard key={m.id} match={m} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatDateHeader(isoDate: string, locale: Locale): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
