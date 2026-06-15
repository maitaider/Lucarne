import { setRequestLocale } from "next-intl/server";
import {
  listMatches,
  groupMatchesByDate,
  type MatchListItem,
} from "@/lib/matches/queries";
import { getGroupStandings } from "@/lib/matches/group-standings";
import { getMyPicksByMatch, type MyPick } from "@/lib/bets/my-picks";
import { getCommunityOdds, type CommunityOdds } from "@/lib/bets/community-odds";
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
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  Trophy,
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

  // Group consensus per match (anonymous % home/draw/away) — shown on every
  // calendar/knockout card now that group picks are public (anti-cheat
  // dropped). Skipped on the groups tab, which renders no MatchCard.
  const consensus =
    currentView === "groups"
      ? new Map<string, CommunityOdds>()
      : await getCommunityOdds(allMatches.map((m) => m.id));

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
          canBuyIn={buyIn.can_buy_in}
          locale={L}
        />
      )}
      <TournamentHub
        locale={L}
        currentView={currentView}
        totalMatches={allMatches.length}
        groupsCount={groups.length}
        knockoutCount={knockoutCount}
        liveCount={liveCount}
        finishedCount={finishedCount}
        scheduledCount={scheduledCount}
      />

      {currentView === "groups" && (
        <section>
          {groups.length === 0 ? (
            <GroupsFormatPreview locale={L} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          accessClosed={!buyIn.can_bet && !buyIn.can_buy_in}
          followedIds={followedIds}
          consensus={consensus}
        />
      )}

      {currentView === "knockout" && (
        <KnockoutView
          matches={allMatches}
          locale={L}
          myPicksByMatch={myPicksByMatch}
          canBet={buyIn.can_bet}
          accessClosed={!buyIn.can_bet && !buyIn.can_buy_in}
          followedIds={followedIds}
          consensus={consensus}
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
    <div className="flex w-full rounded-sm border border-white/[0.1] bg-abyss/[0.44] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl md:inline-flex md:w-auto">
      {tabs.map((t) => {
        const isActive = t.id === current;
        const Icon = t.icon;
        const href = t.id === "calendar" ? "/matches" : `/matches?view=${t.id}`;
        return (
          <Link
            key={t.id}
            href={href}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition md:flex-none md:justify-start",
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

/**
 * Single translucent "tournament control center" panel. Folds what used to be
 * three scattered blocks — the hero, the view tabs, and the "Signal tournoi"
 * card — into one frosted-glass window with three stacked bands:
 *   1. identity (badge + title + tagline)
 *   2. metrics strip (structure stats) + live progress bar
 *   3. view tabs + live indicator
 * The "played" count lived in two places before (Calendar stat detail + Pulse);
 * here it appears once, inside the progress band.
 */
function TournamentHub({
  locale,
  currentView,
  totalMatches,
  groupsCount,
  knockoutCount,
  liveCount,
  finishedCount,
  scheduledCount,
}: {
  locale: Locale;
  currentView: View;
  totalMatches: number;
  groupsCount: number;
  knockoutCount: number;
  liveCount: number;
  finishedCount: number;
  scheduledCount: number;
}) {
  const fr = locale === "fr";
  const total = totalMatches || 104;
  const playedPct = total > 0 ? Math.round((finishedCount / total) * 100) : 0;
  const stats = [
    { value: 48, label: fr ? "équipes" : "teams" },
    { value: groupsCount || 12, label: fr ? "groupes" : "groups" },
    { value: total, label: fr ? "matchs" : "matches" },
    { value: knockoutCount || 32, label: fr ? "phase finale" : "knockout" },
  ];

  return (
    <header className="relative mb-6 overflow-hidden rounded-md border border-white/[0.12] bg-gradient-to-br from-abyss/[0.82] via-surface-1/[0.58] to-surface-1/[0.34] shadow-[0_26px_85px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl">
      {/* soft gold glow, top-left, behind the title */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-gold-500/10 blur-3xl"
      />

      {/* Band 1 — identity */}
      <div className="relative flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
            <Trophy className="size-3.5" />
            {fr ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
          </div>
          <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
            {fr ? "Centre tournoi" : "Tournament center"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            {fr
              ? "Groupes, calendrier, phase finale et signaux live réunis pour analyser, comparer et parier vite."
              : "Groups, calendar, knockout bracket, and live signals in one place to scan, compare, and bet fast."}
          </p>
        </div>
        <LiveSignal locale={locale} liveCount={liveCount} className="hidden md:inline-flex" />
      </div>

      {/* Band 2 — metrics strip + live progress */}
      <div className="relative grid border-t border-white/[0.08] lg:grid-cols-[1.65fr_1fr]">
        <dl className="grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-abyss/[0.46] px-4 py-3.5">
              <dd className="font-display text-2xl font-semibold tabular-nums text-text-primary">
                {s.value}
              </dd>
              <dt className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>

        <div className="border-t border-white/[0.08] bg-abyss/[0.52] px-4 py-3.5 lg:border-l lg:border-t-0">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-text-tertiary">{fr ? "Progression" : "Progress"}</span>
            <span className="font-mono tabular-nums text-text-secondary">
              {finishedCount}/{total} · {playedPct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-abyss/70 ring-1 ring-inset ring-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 shadow-glow-primary transition-[width]"
              style={{ width: `${Math.max(playedPct, 1.5)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-text-tertiary">
            <span><span className="font-semibold text-text-secondary">{scheduledCount}</span> {fr ? "à venir" : "upcoming"}</span>
            <span className="text-white/15">·</span>
            <span><span className="font-semibold text-text-secondary">{finishedCount}</span> {fr ? "joués" : "played"}</span>
            <span className="text-white/15">·</span>
            <span className={liveCount > 0 ? "text-violet-300" : ""}>
              <span className={cn("font-semibold", liveCount > 0 ? "text-violet-200" : "text-text-secondary")}>{liveCount}</span> {fr ? "en direct" : "live"}
            </span>
          </div>
        </div>
      </div>

      {/* Band 3 — view tabs (live state already shown in the progress band) */}
      <div className="relative border-t border-white/[0.08] p-3">
        <ViewTabs current={currentView} locale={locale} />
      </div>
    </header>
  );
}

/** Compact live status pill: a pinging "X en direct" link when live, else a muted CTA. */
function LiveSignal({
  locale,
  liveCount,
  className,
}: {
  locale: Locale;
  liveCount: number;
  className?: string;
}) {
  const fr = locale === "fr";
  if (liveCount > 0) {
    return (
      <Link
        href="/matches?view=calendar"
        className={cn(
          "shrink-0 items-center gap-2 rounded-full border border-violet-500/45 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/[0.2]",
          className ?? "inline-flex",
        )}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-violet-400" />
        </span>
        {liveCount} {fr ? "en direct" : "live now"}
      </Link>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-text-tertiary",
        className ?? "inline-flex",
      )}
    >
      <Activity className="size-3.5" strokeWidth={1.8} />
      {fr ? "Aucun match en direct" : "No live match"}
    </span>
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
  consensus,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  stage?: string;
  group?: string;
  locale: Locale;
  myPicksByMatch: Map<string, MyPick[]>;
  canBet: boolean;
  accessClosed: boolean;
  followedIds: Set<string>;
  consensus: Map<string, CommunityOdds>;
}) {
  let filtered = matches;
  if (stage && stage !== "all") filtered = filtered.filter((m) => m.stage === stage);
  if (group) filtered = filtered.filter((m) => m.group_label === group);

  const fr = locale === "fr";

  // The complaint: finished matches pile up at the top and push upcoming ones
  // below the fold — worse every day. Fix: upcoming first (soonest → latest),
  // past results in a collapsed section below (most recent → oldest).
  const upcoming = filtered.filter((m) => m.status !== "finished");
  const past = filtered.filter((m) => m.status === "finished");

  const upcomingByDate = groupMatchesByDate(upcoming);
  const upcomingDates = Array.from(upcomingByDate.keys()).sort();
  const pastByDate = groupMatchesByDate(past);
  const pastDates = Array.from(pastByDate.keys()).sort().reverse();

  const renderDay = (date: string, list: MatchListItem[]) => (
    <section key={date}>
      <h2 className="sticky top-14 z-20 mb-3 flex items-center gap-2 rounded-sm bg-abyss/80 px-2 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary backdrop-blur-md md:top-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <span className="shrink-0">{formatDateHeader(date, locale)}</span>
        <span className="h-px flex-1 bg-border-subtle/70" />
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            locale={locale}
            myPicks={myPicksByMatch.get(m.id)}
            canBet={canBet}
            accessClosed={accessClosed}
            following={followedIds.has(m.id)}
            odds={consensus.get(m.id)}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <StageFilter activeStage={stage} locale={locale} />
      {filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/[0.12] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-10 text-center">
          <p className="text-text-secondary">
            {fr ? "Aucun match dans cette catégorie." : "No matches here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* À venir — en tête, du plus proche au plus lointain */}
          {upcomingDates.length > 0 ? (
            <div className="space-y-8">
              {upcomingDates.map((date) => renderDay(date, upcomingByDate.get(date)!))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-white/[0.12] bg-surface-1/[0.6] px-4 py-8 text-center text-sm text-text-secondary">
              {fr
                ? "Aucun match à venir dans cette catégorie."
                : "No upcoming matches in this category."}
            </div>
          )}

          {/* Résultats — repliés par défaut (déployés si plus rien à venir) pour
              que les matchs passés n'enterrent plus les matchs à venir. */}
          {pastDates.length > 0 && (
            <details open={upcomingDates.length === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-sm border border-white/[0.08] bg-surface-1/[0.5] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary backdrop-blur-md transition hover:border-white/[0.16] hover:text-text-primary [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  className="size-4 shrink-0 text-text-tertiary transition group-open:rotate-180"
                  strokeWidth={2}
                />
                <span>{fr ? "Résultats" : "Results"}</span>
                <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-tertiary">
                  {past.length}
                </span>
                <span className="ml-auto text-[10px] font-medium normal-case text-text-tertiary">
                  {fr ? "matchs joués" : "played"}
                </span>
              </summary>
              <div className="mt-4 space-y-8">
                {pastDates.map((date) => renderDay(date, pastByDate.get(date)!))}
              </div>
            </details>
          )}
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
  consensus,
}: {
  matches: Awaited<ReturnType<typeof listMatches>>;
  locale: Locale;
  myPicksByMatch: Map<string, MyPick[]>;
  canBet: boolean;
  accessClosed: boolean;
  followedIds: Set<string>;
  consensus: Map<string, CommunityOdds>;
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
                odds={consensus.get(m.id)}
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
