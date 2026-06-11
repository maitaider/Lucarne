import { setRequestLocale } from "next-intl/server";
import { listMatches, groupMatchesByDate } from "@/lib/matches/queries";
import { getGroupStandings } from "@/lib/matches/group-standings";
import { getMyPicksByMatch, type MyPick } from "@/lib/bets/my-picks";
import { listMyFollowedMatchIds } from "@/lib/matches/follows";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { MatchCard } from "@/components/match/match-card";
import { GroupTableCard } from "@/components/match/group-table";
import { Bracket } from "@/components/match/bracket";
import { LiveRefresh } from "@/components/live/live-refresh";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import {
  Activity,
  CalendarDays,
  LayoutGrid,
  MapPinned,
  Network,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";

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

  // Default to the calendar (flag-rich fixtures) — it's what "Calendrier"
  // in the nav points at. Groups/knockout are reached via the in-page tabs.
  const currentView: View =
    view === "groups" ? "groups" : view === "knockout" ? "knockout" : "calendar";

  const [allMatches, groups, myPicksByMatch, buyIn, followedIdsArr] =
    await Promise.all([
      listMatches(),
      currentView === "groups" ? getGroupStandings() : Promise.resolve([]),
      getMyPicksByMatch(),
      getMyBuyInStatus(),
      listMyFollowedMatchIds(),
    ]);
  const followedIds = new Set(followedIdsArr);

  const liveCount = allMatches.filter((m) => m.status === "live").length;
  const finishedCount = allMatches.filter((m) => m.status === "finished").length;
  const scheduledCount = allMatches.filter((m) => m.status === "scheduled").length;
  const knockoutCount = allMatches.filter((m) => m.stage !== "group").length;

  return (
    <main className="lk-stagger mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <LiveRefresh />
      {!buyIn.can_bet && (
        <BuyInBanner
          amountCents={buyIn.amount_cents}
          currency={buyIn.settings.currency}
          deadlineAt={buyIn.deadline_at}
          deadlinePassed={buyIn.deadline_passed}
          locale={L}
        />
      )}
      {/* Header with tournament summary */}
      <header className="relative mb-6 overflow-hidden rounded-sm border border-white/[0.12] bg-surface-1/[0.7] p-5 shadow-[0_26px_85px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-sm border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
              <Trophy className="size-3.5" />
              {L === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
            </div>
            <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
              {L === "fr" ? "Centre tournoi" : "Tournament center"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {L === "fr"
                ? "Groupes, calendrier, phase finale et signaux live réunis dans une vue pensée pour analyser, comparer et parier vite."
                : "Groups, calendar, knockout bracket, and live signals in one view built to scan, compare, and bet fast."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[580px] xl:grid-cols-4">
            <TournamentStat
              icon={MapPinned}
              label={L === "fr" ? "Format" : "Format"}
              value="48"
              detail={L === "fr" ? "équipes" : "teams"}
              accent="gold"
            />
            <TournamentStat
              icon={LayoutGrid}
              label={L === "fr" ? "Groupes" : "Groups"}
              value={groups.length || 12}
              detail={L === "fr" ? "tables" : "tables"}
              accent="primary"
            />
            <TournamentStat
              icon={CalendarDays}
              label={L === "fr" ? "Calendrier" : "Calendar"}
              value={allMatches.length || 104}
              detail={`${finishedCount}/${allMatches.length || 104} ${L === "fr" ? "joués" : "played"}`}
              accent="violet"
            />
            <TournamentStat
              icon={Network}
              label={L === "fr" ? "Arbre" : "Bracket"}
              value={knockoutCount || 32}
              detail={L === "fr" ? "matchs à élimination" : "knockout ties"}
              accent="gold"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <ViewTabs current={currentView} locale={L} />

      <TournamentPulse
        locale={L}
        liveCount={liveCount}
        scheduledCount={scheduledCount}
        finishedCount={finishedCount}
      />

      {currentView === "groups" && (
        <section>
          {groups.length === 0 ? (
            <GroupsFormatPreview locale={L} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <GroupTableCard key={g.group_label} group={g} locale={L} />
              ))}
            </div>
          )}
        </section>
      )}

      {currentView === "calendar" && (
        <CalendarView
          matches={allMatches}
          stage={stage}
          group={group}
          locale={L}
          myPicksByMatch={myPicksByMatch}
          canBet={buyIn.can_bet}
          accessClosed={buyIn.deadline_passed}
          followedIds={followedIds}
        />
      )}

      {currentView === "knockout" && (
        <KnockoutView
          matches={allMatches}
          locale={L}
          myPicksByMatch={myPicksByMatch}
          canBet={buyIn.can_bet}
          accessClosed={buyIn.deadline_passed}
          followedIds={followedIds}
        />
      )}
    </main>
  );
}

function ViewTabs({ current, locale }: { current: View; locale: Locale }) {
  const tabs: { id: View; fr: string; en: string; icon: typeof LayoutGrid }[] = [
    { id: "calendar", fr: "Calendrier", en: "Calendar", icon: CalendarDays },
    { id: "groups", fr: "Groupes", en: "Groups", icon: LayoutGrid },
    { id: "knockout", fr: "Phase finale", en: "Knockout", icon: Trophy },
  ];

  return (
    <div className="mb-6 inline-flex rounded-sm border border-white/[0.1] bg-abyss/[0.44] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      {tabs.map((t) => {
        const isActive = t.id === current;
        const Icon = t.icon;
        const href = t.id === "calendar" ? "/matches" : `/matches?view=${t.id}`;
        return (
          <Link
            key={t.id}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition",
              isActive
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
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

function TournamentStat({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  accent: "primary" | "gold" | "violet";
}) {
  const color = {
    primary: "border-primary-500/25 bg-primary-500/[0.09] text-primary-400",
    gold: "border-gold-500/30 bg-gold-500/[0.09] text-gold-400",
    violet: "border-violet-500/25 bg-violet-500/[0.09] text-violet-400",
  }[accent];

  return (
    <div className="rounded-sm border border-white/[0.09] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-sm border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-0.5 truncate text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function TournamentPulse({
  locale,
  liveCount,
  scheduledCount,
  finishedCount,
}: {
  locale: Locale;
  liveCount: number;
  scheduledCount: number;
  finishedCount: number;
}) {
  return (
    <section className="mb-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.62] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-sm border border-primary-500/25 bg-primary-500/[0.1] text-primary-400">
              <Activity className="size-5" strokeWidth={1.6} />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">
                {locale === "fr" ? "Signal tournoi" : "Tournament signal"}
              </h2>
              <p className="text-sm text-text-secondary">
                {locale === "fr"
                  ? "Une lecture rapide de l’état du Mondial avant d’ouvrir un match."
                  : "A quick read on the tournament state before opening a fixture."}
              </p>
            </div>
          </div>
          {liveCount > 0 ? (
            <Link
              href="/matches?view=calendar"
              className="inline-flex items-center gap-2 rounded-sm border border-violet-500/40 bg-violet-500/[0.1] px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/[0.16]"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-violet-400" />
              </span>
              {liveCount} {locale === "fr" ? "en direct" : "live now"}
            </Link>
          ) : (
            <span className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-text-secondary">
              {locale === "fr" ? "Prochain live à surveiller" : "Next live to watch"}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <PulseTile label={locale === "fr" ? "À venir" : "Upcoming"} value={scheduledCount} />
        <PulseTile label={locale === "fr" ? "Joués" : "Played"} value={finishedCount} />
        <PulseTile label={locale === "fr" ? "Live" : "Live"} value={liveCount} gold />
      </div>
    </section>
  );
}

function PulseTile({
  label,
  value,
  gold,
}: {
  label: string;
  value: number;
  gold?: boolean;
}) {
  return (
    <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.62] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div
        className={`font-display text-2xl font-semibold tabular-nums ${
          gold ? "text-gold-400" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
    </div>
  );
}

function GroupsFormatPreview({ locale }: { locale: Locale }) {
  const groups = "ABCDEFGHIJKL".split("");

  return (
    <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.66] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <ShieldCheck className="size-4 text-gold-400" strokeWidth={1.7} />
            {locale === "fr" ? "Structure des groupes" : "Group structure"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? "Le tableau se remplira automatiquement avec les résultats. En attendant, l’app présente le format complet du tournoi."
              : "The table will populate automatically with results. Until then, the app presents the full tournament format."}
          </p>
        </div>
        <Link
          href="/matches?view=calendar"
          className="inline-flex items-center justify-center rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
        >
          {locale === "fr" ? "Voir le calendrier" : "Open calendar"}
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {groups.map((group, idx) => (
          <div
            key={group}
            className="rounded-sm border border-white/[0.08] bg-white/[0.035] p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-sm bg-primary-500/[0.12] font-display text-sm font-bold text-primary-400 ring-1 ring-primary-500/25">
                {group}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {idx < 8 ? (locale === "fr" ? "forte densité" : "high density") : "wild"}
              </span>
            </div>
            <div className="space-y-1.5">
              {[1, 2, 3, 4].map((seed) => (
                <div key={seed} className="flex items-center gap-2 rounded-xs bg-abyss/[0.35] px-2 py-1.5">
                  <span className="size-1.5 rounded-full bg-gold-400" />
                  <span className="text-xs text-text-secondary">
                    {locale === "fr" ? "Équipe" : "Team"} {seed}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarView({
  matches,
  stage,
  group,
  locale,
  myPicksByMatch,
  canBet,
  accessClosed,
  followedIds,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  stage?: string;
  group?: string;
  locale: Locale;
  myPicksByMatch: Map<string, MyPick[]>;
  canBet: boolean;
  accessClosed: boolean;
  followedIds: Set<string>;
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
        <div className="rounded-sm border border-dashed border-white/[0.12] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-10 text-center">
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
                  <MatchCard
                    key={m.id}
                    match={m}
                    locale={locale}
                    myPicks={myPicksByMatch.get(m.id)}
                    canBet={canBet}
                    accessClosed={accessClosed}
                    following={followedIds.has(m.id)}
                  />
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
              "rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition",
              isActive
                ? "bg-text-primary text-abyss"
                : "border border-white/[0.08] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] text-text-secondary hover:border-primary-500/35 hover:text-text-primary",
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
  myPicksByMatch,
  canBet,
  accessClosed,
  followedIds,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  locale: Locale;
  myPicksByMatch: Map<string, MyPick[]>;
  canBet: boolean;
  accessClosed: boolean;
  followedIds: Set<string>;
}) {
  const knockoutMatches = matches.filter(
    (m) => m.stage !== "group" && m.stage !== "third_place",
  );
  const thirdPlace = matches.filter((m) => m.stage === "third_place");

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-text-primary">
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
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-text-primary">
            <Trophy className="size-4 text-amber-500" strokeWidth={1.5} />
            {locale === "fr" ? "Match pour la 3ᵉ place" : "Third place playoff"}
          </h2>
          <div className="max-w-md">
            {thirdPlace.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                locale={locale}
                myPicks={myPicksByMatch.get(m.id)}
                canBet={canBet}
                accessClosed={accessClosed}
                following={followedIds.has(m.id)}
              />
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
