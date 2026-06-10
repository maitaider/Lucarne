import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getPlayerAchievements } from "@/lib/profile/achievements";
import { PlayerBadges } from "@/components/profile/player-badges";
import { getMyStats } from "@/lib/profile/stats";
import { listMatches, type MatchListItem } from "@/lib/matches/queries";
import { getFollowedMatches } from "@/lib/matches/follows";
import { FollowedMatchesPanel } from "@/components/dashboard/followed-matches-panel";
import { listMyBets } from "@/lib/bets/queries";
import {
  getGlobalStandings,
  listMyLeagues,
  type StandingEntry,
} from "@/lib/leagues/queries";
import { LiveRefresh } from "@/components/live/live-refresh";
import { ChatPreviewCard } from "@/components/dashboard/chat-preview-card";
import { FlashRow } from "@/components/leaderboard/flash-row";
import { getMyPicksByMatch, type MyPick } from "@/lib/bets/my-picks";
import { picksToExisting } from "@/lib/bets/picks-to-existing";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { getMyTournamentPrediction } from "@/lib/predictions/queries";
import { getPotTotal } from "@/lib/admin/economy";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { LockCountdown } from "@/components/ui/lock-countdown";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { WorldTrophyMark } from "@/components/brand/sport-icons";
import { BetStatusBadge } from "@/components/bet/bet-status-badge";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { Flag } from "@/components/team/flag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CountUp } from "@/components/ui/count-up";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Coins,
  Crown,
  Globe,
  HelpCircle,
  Receipt,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [
    user,
    stats,
    allMatches,
    myBets,
    myLeagues,
    standings,
    myPicksByMatch,
    buyIn,
    prediction,
    achievements,
    followedMatches,
    potTotal,
  ] = await Promise.all([
    getCurrentUser(),
    getMyStats(),
    listMatches(),
    listMyBets(),
    listMyLeagues(),
    getGlobalStandings(10),
    getMyPicksByMatch(),
    getMyBuyInStatus(),
    getMyTournamentPrediction(),
    (async () => {
      const u = await getCurrentUser();
      return u?.username ? getPlayerAchievements(u.username) : null;
    })(),
    getFollowedMatches(),
    getPotTotal(),
  ]);

  // Resolve the user's predicted champion from the teams present in the
  // fixtures we already loaded (group matches carry real team rows).
  const teamMap = new Map<
    string,
    { name_fr: string; name_en: string; iso_code: string | null }
  >();
  for (const m of allMatches) {
    if (m.home_team) teamMap.set(m.home_team.id, m.home_team);
    if (m.away_team) teamMap.set(m.away_team.id, m.away_team);
  }
  const championTeam = prediction.champion_team_id
    ? (teamMap.get(prediction.champion_team_id) ?? null)
    : null;

  const now = Date.now();
  const activeBets = myBets.filter((b) => b.status === "validated");
  const winRatePct = Math.round(stats.win_rate * 100);
  const myRank = user && standings.find((s) => s.user_id === user.id)?.rank;
  const firstName =
    (user?.display_name?.trim() || user?.username || "").split(" ")[0] ?? "";

  // Featured: a live match, else the next scheduled one (>1h buffer).
  const liveMatch = allMatches.find((m) => m.status === "live") ?? null;
  const nextMatch = allMatches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        new Date(m.kickoff_at).getTime() - now > 60 * 60_000,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    )[0];
  const featured = liveMatch ?? nextMatch ?? null;

  const upcoming = allMatches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        m.id !== featured?.id &&
        new Date(m.kickoff_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    )
    .slice(0, 5);

  const top5 = standings.slice(0, 5);
  const myRow = user ? standings.find((s) => s.user_id === user.id) : null;
  const showMyRow = myRow && top5.every((r) => r.user_id !== myRow.user_id);

  // Prediction progress for the next-step panel. "Open" mirrors the predict
  // UI lock: a match is editable until kickoff − 1h. A match is covered by a
  // confirmed score pick or — knockout ties are predicted via the bracket
  // (tournament_predictions), not score bets — by a bracket winner (mirrors
  // the /predict progress: group scores + knockout picks). Both sides of the
  // progress are scoped to open matches so the panel can't claim "all picks
  // in" while an open match is still missing one.
  const isCovered = (m: MatchListItem) =>
    (myPicksByMatch.get(m.id) ?? []).some(
      (p) => p.bet_type === "exact_score" && p.status === "validated",
    ) ||
    (m.stage !== "group" &&
      m.match_number != null &&
      Boolean(prediction.knockout_winners[String(m.match_number)]));
  const openMatches = allMatches.filter(
    (m) =>
      m.status === "scheduled" &&
      new Date(m.kickoff_at).getTime() - now > 60 * 60_000,
  );
  const openCount = openMatches.length;
  const picksDone = openMatches.filter(isCovered).length;
  const hasAnyPick =
    Object.keys(prediction.knockout_winners).length > 0 ||
    Array.from(myPicksByMatch.values()).some((picks) =>
      picks.some(
        (p) => p.bet_type === "exact_score" && p.status === "validated",
      ),
    );

  // Next lock: the earliest open match still missing a pick (past that
  // moment the prediction set can no longer be completed in full) — or, when
  // everything is covered, the earliest open match, since picks stay
  // editable until each match locks. Hidden for non-payers (they can't
  // pick; BuyInBanner carries their deadline).
  const byKickoff = (a: MatchListItem, b: MatchListItem) =>
    new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
  const nextToLock =
    openMatches.filter((m) => !isCovered(m)).sort(byKickoff)[0] ??
    [...openMatches].sort(byKickoff)[0];
  const nextLockAt =
    buyIn.can_bet && nextToLock
      ? new Date(
          new Date(nextToLock.kickoff_at).getTime() - 60 * 60_000,
        ).toISOString()
      : null;
  const nextLockLabel = nextToLock
    ? `${teamName(nextToLock.home_team, nextToLock.home_placeholder, L)} – ${teamName(
        nextToLock.away_team,
        nextToLock.away_placeholder,
        L,
      )}`
    : null;

  // Bracket completion for the hero brief — knockout winners chosen vs the
  // number of knockout fixtures (fallback 32 if KO rounds aren't seeded yet).
  const bracketTotal =
    allMatches.filter((m) => m.stage !== "group").length || 32;
  const bracketDone = Math.min(
    Object.keys(prediction.knockout_winners).length,
    bracketTotal,
  );

  return (
    <main className="lk-stagger mx-auto flex w-full max-w-[1700px] flex-col gap-5 overflow-x-clip px-4 pb-24 pt-6 sm:px-6 lg:px-8">
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

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden rounded-lg border border-border-subtle bg-surface-1/[0.1] shadow-raised backdrop-blur-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[420px] rounded-full bg-primary-500/10 blur-3xl"
        />

        <div className="relative p-4 sm:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-stretch lg:gap-10">
          {/* Left — greeting + KPIs */}
          <div className="flex min-w-0 flex-col">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="gold" size="lg">
                <WorldTrophyMark className="size-3.5" />
                {L === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
              </Badge>
              {/* The next-step panel's lock pill takes over when actionable —
                  avoid two countdowns in the same hero. */}
              {!nextLockAt && (
                <LockCountdown
                  targetAt={buyIn.settings.tournament_start_at}
                  locale={L}
                  prefix={{ fr: "Coup d'envoi dans", en: "Kicks off in" }}
                  pastLabel={{ fr: "Tournoi en cours", en: "Tournament live" }}
                />
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-[1.05] text-text-primary sm:text-4xl lg:text-[2.9rem]">
              {L === "fr" ? "Salut" : "Hey"}
              {firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary sm:text-[15px]">
              {L === "fr"
                ? "Ton QG du Mondial : suis les matchs, pronostique, grimpe au classement."
                : "Your World Cup HQ: follow matches, predict, climb the leaderboard."}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <Stat
                icon={Receipt}
                label={L === "fr" ? "Pronos actifs" : "Active picks"}
                value={<CountUp value={activeBets.length} />}
                detail={L === "fr" ? "à régler" : "open"}
                accent="violet"
                href="/bets"
              />
              <Stat
                icon={Crown}
                label={L === "fr" ? "Points" : "Points"}
                value={<CountUp value={stats.total_points} />}
                detail={
                  stats.settled_bets > 0
                    ? `${winRatePct}% ${L === "fr" ? "réussite" : "win"}`
                    : L === "fr"
                      ? "en attente"
                      : "pending"
                }
                accent="gold"
                href="/leaderboard/global"
              />
              <Stat
                icon={Users}
                label={L === "fr" ? "Rang" : "Rank"}
                value={myRank ? `#${myRank}` : "—"}
                detail={`${myLeagues.length} ${L === "fr" ? "ligues" : "leagues"}`}
                accent="primary"
                href={myRank ? "/leaderboard/global" : "/leagues"}
              />
            </div>

            {/* Season at-a-glance — fills the gap between the KPIs and the
                brief tiles with the player's running performance. */}
            <SeasonStrip
              winRatePct={winRatePct}
              exactCount={achievements?.exact_count ?? 0}
              currentStreak={achievements?.current_streak ?? 0}
              wonCount={achievements?.won_count ?? 0}
              settledBets={stats.settled_bets}
              locale={L}
            />

            {/* Brief — champion, pot, league, bracket — bottom-aligned with
                the next-step panel (lg:mt-auto). */}
            <HeroBrief
              championTeam={championTeam}
              amountCents={buyIn.amount_cents}
              currency={buyIn.settings.currency}
              potTotalCents={potTotal.total_collected_cents}
              payingUsers={potTotal.paying_users_count}
              leagues={myLeagues}
              bracketDone={bracketDone}
              bracketTotal={bracketTotal}
              canBet={buyIn.can_bet}
              locale={L}
            />
          </div>

          {/* Right — the one next step */}
          <NextStepPanel
            locale={L}
            canBet={buyIn.can_bet}
            amountCents={buyIn.amount_cents}
            currency={buyIn.settings.currency}
            openCount={openCount}
            picksDone={picksDone}
            hasAnyPick={hasAnyPick}
            nextLockAt={nextLockAt}
            nextLockLabel={nextLockLabel}
          />
          </div>

          {/* Marquee — the next kickoff, spanning the full hero width */}
          {featured && (
            <HeroNextMatch match={featured} locale={L} className="mt-5" />
          )}
        </div>
      </section>

      {/* Quick actions */}
      <QuickActions locale={L} />

      {/* ===================== MAIN — act first =====================
          Left = your matches (the daily action). Right rail = where you stand
          + your circle. `grid-cols-1` base + `min-w-0` on both columns are
          load-bearing on mobile (an implicit `auto` column would grow to the
          featured match's 80px flags and clip the grid). */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-3">
        {/* Left — your matches */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <SectionLabel icon={CalendarDays}>
            {L === "fr" ? "Tes matchs" : "Your matches"}
          </SectionLabel>
          <FeaturedMatch
            match={featured}
            myPicks={featured ? myPicksByMatch.get(featured.id) : undefined}
            canBet={buyIn.can_bet}
            locale={L}
          />
          <UpcomingCard matches={upcoming} locale={L} />
          <FollowedMatchesPanel matches={followedMatches} locale={L} />
        </div>

        {/* Right rail — standings + your circle */}
        <aside className="flex min-w-0 flex-col gap-4">
          <SectionLabel icon={Trophy}>
            {L === "fr" ? "Classement & cercle" : "Standings & circle"}
          </SectionLabel>
          <MiniLeaderboard
            top5={top5}
            myRow={showMyRow ? (myRow ?? null) : null}
            currentUserId={user?.id ?? null}
            total={standings.length}
            locale={L}
          />
          <LeaguesCard leagues={myLeagues} locale={L} />
          <ChatPreviewCard locale={L} />
          <PlayerBadges achievements={achievements} locale={L} />
          <TicketsCard bets={myBets} locale={L} />
        </aside>
      </div>

      {/* ===================== LE TOURNOI — ambient, last ===================== */}
      <section className="flex flex-col gap-4">
        <SectionLabel icon={Sparkles}>
          {L === "fr" ? "Le tournoi" : "The tournament"}
        </SectionLabel>
        <div className="grid grid-cols-1 gap-5">
          <TournamentCard startAt={buyIn.settings.tournament_start_at} locale={L} />
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section label — gives the dashboard a scannable structure                 */
/* -------------------------------------------------------------------------- */

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.04] text-primary-300">
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <h2 className="font-display text-[13px] font-bold uppercase tracking-wider text-text-secondary">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/[0.1] to-transparent" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Season strip — running performance, fills the hero's left column          */
/* -------------------------------------------------------------------------- */

function SeasonStrip({
  winRatePct,
  exactCount,
  currentStreak,
  wonCount,
  settledBets,
  locale,
}: {
  winRatePct: number;
  exactCount: number;
  currentStreak: number;
  wonCount: number;
  settledBets: number;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const started = settledBets > 0;
  const items: { label: string; value: string }[] = [
    { label: fr ? "Réussite" : "Win rate", value: started ? `${winRatePct}%` : "—" },
    { label: fr ? "Scores exacts" : "Exact", value: started ? `${exactCount}` : "—" },
    { label: fr ? "Série" : "Streak", value: started ? `${currentStreak}` : "—" },
    { label: fr ? "Victoires" : "Wins", value: started ? `${wonCount}` : "—" },
  ];
  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-surface-1/[0.45] px-3.5 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <Sparkles className="size-3 text-primary-300" strokeWidth={2} />
          {fr ? "Ta saison" : "Your season"}
        </span>
        {!started && (
          <span className="text-[10px] text-text-tertiary">
            {fr ? "dès le coup d'envoi" : "from kickoff"}
          </span>
        )}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {items.map((it) => (
          <div key={it.label} className="min-w-0">
            <div className="font-display text-lg font-bold tabular-nums leading-none text-text-primary">
              {it.value}
            </div>
            <div className="mt-1 truncate text-[10px] text-text-tertiary">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero brief — personal at-a-glance row (champion · pot · league)           */
/* -------------------------------------------------------------------------- */

function HeroBrief({
  championTeam,
  amountCents,
  currency,
  potTotalCents,
  payingUsers,
  leagues,
  bracketDone,
  bracketTotal,
  canBet,
  locale,
}: {
  championTeam: { name_fr: string; name_en: string; iso_code: string | null } | null;
  amountCents: number;
  currency: string;
  potTotalCents: number;
  payingUsers: number;
  leagues: Awaited<ReturnType<typeof listMyLeagues>>;
  bracketDone: number;
  bracketTotal: number;
  canBet: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const amount = (amountCents / 100).toLocaleString(fr ? "fr-CA" : "en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const potAmount = (potTotalCents / 100).toLocaleString(fr ? "fr-CA" : "en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const league = leagues[0] ?? null;
  const bracketComplete = bracketTotal > 0 && bracketDone >= bracketTotal;

  return (
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-auto lg:pt-6">
      {/* Champion */}
      <BriefTile
        href={canBet ? "/predict?tab=finale" : "/buy-in"}
        leading={
          championTeam ? (
            <Flag isoCode={championTeam.iso_code} size="md" />
          ) : (
            <BriefIcon icon={Crown} accent="gold" />
          )
        }
        label={fr ? "Ton champion" : "Your champion"}
        value={
          championTeam
            ? fr
              ? championTeam.name_fr
              : championTeam.name_en
            : fr
              ? "À désigner"
              : "Pick one"
        }
        muted={!championTeam}
      />
      {/* Pot — total collected to date (falls back to the per-seat price
          before anyone has paid). */}
      <BriefTile
        href="/how-it-works"
        leading={<BriefIcon icon={Coins} accent="primary" />}
        label={fr ? "Cagnotte" : "The pot"}
        value={potTotalCents > 0 ? potAmount : amount}
        detail={
          potTotalCents > 0
            ? `${payingUsers} ${fr ? "joueurs" : "players"}`
            : fr
              ? "/ joueur"
              : "/ player"
        }
      />
      {/* League */}
      <BriefTile
        href={league ? `/leagues/${league.slug}` : "/leagues/new"}
        leading={<BriefIcon icon={Users} accent="violet" />}
        label={fr ? "Ta ligue" : "Your league"}
        value={league ? league.name : fr ? "Créer" : "Create"}
        detail={
          league
            ? `${league.member_count} ${fr ? "membres" : "members"}`
            : fr
              ? "entre amis"
              : "with friends"
        }
        muted={!league}
      />
      {/* Bracket */}
      <BriefTile
        href={canBet ? "/predict?tab=finale" : "/buy-in"}
        leading={<BriefIcon icon={Trophy} accent="gold" />}
        label={fr ? "Phase finale" : "Bracket"}
        value={`${bracketDone}/${bracketTotal}`}
        detail={
          bracketComplete
            ? fr
              ? "complète"
              : "complete"
            : fr
              ? "vainqueurs"
              : "winners"
        }
        muted={bracketDone === 0}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero next-match marquee — the next kickoff, full hero width               */
/* -------------------------------------------------------------------------- */

function HeroNextMatch({
  match,
  locale,
  className,
}: {
  match: MatchListItem;
  locale: Locale;
  className?: string;
}) {
  const fr = locale === "fr";
  const isLive = match.status === "live";
  const home = teamName(match.home_team, match.home_placeholder, locale);
  const away = teamName(match.away_team, match.away_placeholder, locale);
  const kickoff = new Date(match.kickoff_at);
  const dateLabel = kickoff.toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = kickoff.toLocaleTimeString(fr ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
  const city = match.venue
    ? fr
      ? match.venue.city_fr
      : match.venue.city_en
    : null;

  return (
    <Link
      href={isLive ? "/live" : `/matches/${match.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-md border px-4 py-3 transition sm:flex-row sm:items-center sm:gap-4",
        isLive
          ? "border-violet-500/30 bg-violet-500/[0.06] hover:border-violet-500/50"
          : "border-border-subtle bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]",
        className,
      )}
    >
      <Badge
        tone={isLive ? "violet" : "primary"}
        icon={isLive ? undefined : CalendarClock}
        pulse={isLive}
      >
        {isLive
          ? fr
            ? "En direct"
            : "Live now"
          : fr
            ? "Prochain coup d'envoi"
            : "Next kickoff"}
      </Badge>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Flag isoCode={match.home_team?.iso_code ?? null} size="sm" />
        <span className="truncate font-display text-sm font-semibold text-text-primary">
          {home}
        </span>
        {isLive || match.status === "finished" ? (
          <span className="shrink-0 font-display text-sm font-bold tabular-nums text-violet-200">
            {match.home_score ?? 0}–{match.away_score ?? 0}
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-text-tertiary">
            vs
          </span>
        )}
        <span className="truncate font-display text-sm font-semibold text-text-primary">
          {away}
        </span>
        <Flag isoCode={match.away_team?.iso_code ?? null} size="sm" />
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs text-text-tertiary">
        <span className="font-mono tabular-nums text-text-secondary">
          {dateLabel} · {timeLabel}
        </span>
        {city && <span className="hidden sm:inline">· {city}</span>}
        <ArrowRight
          className="size-4 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
          strokeWidth={1.8}
        />
      </div>
    </Link>
  );
}

const BRIEF_ICON_ACCENT: Record<"gold" | "primary" | "violet", string> = {
  gold: "bg-gold-500/12 text-gold-300 ring-gold-500/25",
  primary: "bg-primary-500/12 text-primary-300 ring-primary-500/25",
  violet: "bg-violet-500/12 text-violet-300 ring-violet-500/25",
};

function BriefIcon({
  icon: Icon,
  accent,
}: {
  icon: LucideIcon;
  accent: "gold" | "primary" | "violet";
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md ring-1",
        BRIEF_ICON_ACCENT[accent],
      )}
    >
      <Icon className="size-4" strokeWidth={1.9} />
    </span>
  );
}

function BriefTile({
  href,
  leading,
  label,
  value,
  detail,
  muted,
}: {
  href: string;
  leading: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-1/[0.45] px-2.5 py-2.5 backdrop-blur-md transition hover:border-white/[0.14] hover:bg-surface-1/[0.6]"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </div>
        <div
          className={cn(
            "truncate font-display text-[15px] font-bold leading-tight",
            muted ? "text-text-secondary" : "text-text-primary",
          )}
        >
          {value}
        </div>
        {detail && (
          <div className="truncate text-[10px] text-text-tertiary">{detail}</div>
        )}
      </div>
      <ArrowRight
        className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        strokeWidth={2}
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Next step (hero right panel)                                              */
/* -------------------------------------------------------------------------- */

function NextStepPanel({
  locale,
  canBet,
  amountCents,
  currency,
  openCount,
  picksDone,
  hasAnyPick,
  nextLockAt,
  nextLockLabel,
}: {
  locale: Locale;
  canBet: boolean;
  amountCents: number;
  currency: string;
  /** Matches still editable (kickoff more than 1h away). */
  openCount: number;
  /** Open matches covered by a score pick or a bracket winner. */
  picksDone: number;
  /** True if the user ever placed a score pick or a bracket winner. */
  hasAnyPick: boolean;
  /** When the earliest still-unpicked match locks (kickoff − 1h), or null. */
  nextLockAt: string | null;
  /** Teams of that match, e.g. "Mexique – Afrique du Sud". */
  nextLockLabel: string | null;
}) {
  const fr = locale === "fr";
  const remaining = Math.max(openCount - picksDone, 0);

  let kicker: string;
  let title: string;
  let body: string;
  let ctaLabel: string;
  let ctaHref: string;

  if (!canBet) {
    const amount = (amountCents / 100).toLocaleString(fr ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    kicker = fr ? "Étape 1" : "Step 1";
    title = fr ? "Achète ta place" : "Buy your seat";
    body = fr
      ? `${amount} une fois pour pronostiquer les 104 matchs.`
      : `${amount} once to predict all 104 matches.`;
    ctaLabel = fr ? "Acheter ma place" : "Buy my seat";
    ctaHref = "/buy-in";
  } else if (!hasAnyPick) {
    kicker = fr ? "On commence" : "Let's go";
    title = fr ? "Fais ton premier prono" : "Make your first pick";
    body = fr
      ? "Classe les groupes et choisis tes vainqueurs. Un clic par match."
      : "Rank groups and pick winners. One tap per match.";
    ctaLabel = fr ? "Commencer" : "Start";
    ctaHref = "/predict";
  } else if (remaining > 0) {
    kicker = fr ? "Continue" : "Keep going";
    title = fr
      ? `${remaining} match${remaining > 1 ? "s" : ""} à pronostiquer`
      : `${remaining} match${remaining > 1 ? "es" : ""} left`;
    body = fr
      ? "Reprends là où tu t'es arrêté, avant le verrou."
      : "Pick up where you left off, before the lock.";
    ctaLabel = fr ? "Reprendre" : "Resume";
    ctaHref = "/predict";
  } else {
    kicker = fr ? "Bien joué" : "Nicely done";
    title = fr ? "Tous tes pronos sont posés" : "Every pick is in";
    body = fr
      ? "Ajuste-les ou invite des amis dans une ligue."
      : "Tweak them or invite friends to a league.";
    ctaLabel = fr ? "Voir mes pronos" : "Review picks";
    ctaHref = "/predict";
  }

  return (
    <Card
      accent="gold"
      padded="lg"
      className="relative overflow-hidden bg-gradient-to-br from-gold-500/[0.12] via-surface-1/[0.5] to-surface-1/[0.5] backdrop-blur-xl"
    >
      <Image
        src="/assets/lucarne/exports/bracket-network.png"
        alt=""
        width={120}
        height={120}
        className="pointer-events-none absolute -right-3 -top-3 size-24 opacity-25"
      />
      <div className="relative">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
          {kicker}
        </div>
        <h2 className="mt-1 font-display text-xl font-bold leading-tight text-text-primary">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-text-secondary">{body}</p>

        {nextLockAt && (
          <CountdownTimer
            targetAt={nextLockAt}
            locale={locale}
            title={fr ? "Prochain verrou" : "Next lock"}
            subtitle={nextLockLabel ?? undefined}
            href="/predict"
            urgentWithinHours={3}
            pastLabel={fr ? "Verrou passé" : "Lock passed"}
            className="mt-4"
          />
        )}

        {canBet && openCount > 0 && (
          <ProgressBar
            value={picksDone}
            max={openCount}
            accent="gold"
            label={fr ? "Pronos posés" : "Picks placed"}
            className="mt-4"
          />
        )}

        <Button
          href={ctaHref}
          variant="gold"
          size="lg"
          block
          iconRight={ArrowRight}
          className="mt-4"
        >
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Featured match                                                            */
/* -------------------------------------------------------------------------- */

function FeaturedMatch({
  match,
  myPicks,
  canBet,
  locale,
}: {
  match: MatchListItem | null;
  myPicks?: MyPick[];
  canBet: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";
  if (!match) {
    return (
      <Card padded="lg" className="flex items-center justify-center">
        <div className="py-10 text-center">
          <CalendarClock
            className="mx-auto mb-3 size-8 text-text-tertiary"
            strokeWidth={1.4}
          />
          <p className="text-sm text-text-secondary">
            {fr ? "Aucun match programmé pour le moment." : "No upcoming match yet."}
          </p>
        </div>
      </Card>
    );
  }

  const isLive = match.status === "live";
  const home = teamName(match.home_team, match.home_placeholder, locale);
  const away = teamName(match.away_team, match.away_placeholder, locale);
  const kickoff = new Date(match.kickoff_at);
  const dateLabel = kickoff.toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLabel = kickoff.toLocaleTimeString(fr ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });
  const hasPick = myPicks?.some((p) => p.status === "validated") ?? false;
  const scorePick = myPicks?.find(
    (p) => p.bet_type === "exact_score" && p.status === "validated",
  );
  const pred =
    scorePick && scorePick.payload && typeof scorePick.payload === "object"
      ? (() => {
          const o = scorePick.payload as Record<string, unknown>;
          return typeof o.home === "number" && typeof o.away === "number"
            ? { home: o.home, away: o.away }
            : null;
        })()
      : null;

  return (
    <Card
      accent={isLive ? "violet" : "primary"}
      padded="lg"
      className="relative overflow-hidden"
    >
      <header className="mb-5 flex items-center justify-between gap-2">
        {isLive ? (
          <Badge tone="violet" size="lg" pulse>
            {fr ? "En direct" : "Live now"}
          </Badge>
        ) : (
          <Badge tone="primary" size="lg" icon={CalendarClock}>
            {fr ? "Prochain coup d'envoi" : "Next kickoff"}
          </Badge>
        )}
        <span className="font-mono text-xs tabular-nums text-text-tertiary">
          {dateLabel} · {timeLabel}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
        <FeaturedTeam
          name={home}
          iso={match.home_team?.iso_code ?? null}
          align="right"
        />
        {isLive || match.status === "finished" ? (
          <div className="flex shrink-0 flex-col items-center gap-1 px-1">
            <div
              className={cn(
                "font-display text-4xl font-bold tabular-nums leading-none sm:text-5xl",
                isLive ? "text-violet-200" : "text-text-primary",
              )}
            >
              {match.home_score ?? 0}
              <span className="mx-2 text-text-tertiary">·</span>
              {match.away_score ?? 0}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
              {isLive ? (fr ? "En cours" : "Live") : fr ? "Terminé" : "Final"}
            </span>
          </div>
        ) : pred ? (
          <div className="flex shrink-0 flex-col items-center gap-1 px-1">
            <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
              {fr ? "Ton prono" : "Your pick"}
            </span>
            <div className="font-display text-4xl font-bold tabular-nums leading-none text-text-primary sm:text-5xl">
              {pred.home}
              <span className="mx-2 text-text-tertiary">–</span>
              {pred.away}
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-center gap-1 px-1">
            <span className="font-display text-2xl font-bold text-text-tertiary sm:text-3xl">
              VS
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wider text-text-tertiary">
              {fr ? "À toi de jouer" : "Your call"}
            </span>
          </div>
        )}
        <FeaturedTeam
          name={away}
          iso={match.away_team?.iso_code ?? null}
          align="left"
        />
      </div>

      {match.venue && (
        <p className="mt-4 text-center text-xs text-text-tertiary">
          {fr ? match.venue.city_fr : match.venue.city_en} · {match.venue.name}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {match.status === "scheduled" && (
          <div className="flex-1">
            <QuickBetButton
              match={match}
              locale={locale}
              variant="block"
              hasPick={hasPick}
              existing={picksToExisting(myPicks)}
              canBet={canBet}
            />
          </div>
        )}
        <Button
          href={isLive ? "/live" : `/matches/${match.id}`}
          variant={match.status === "scheduled" ? "secondary" : "primary"}
          size="lg"
          iconRight={ArrowRight}
        >
          {isLive
            ? fr
              ? "Suivre le live"
              : "Follow live"
            : fr
              ? "Voir le match"
              : "Match details"}
        </Button>
      </div>
    </Card>
  );
}

function FeaturedTeam({
  name,
  iso,
  align,
}: {
  name: string;
  iso: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <Flag isoCode={iso} size="2xl" />
      <span className="line-clamp-2 font-display text-base font-semibold leading-tight text-text-primary sm:text-xl">
        {name}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Upcoming list                                                             */
/* -------------------------------------------------------------------------- */

function UpcomingCard({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <Card padded="none">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <CalendarClock className="size-4 text-text-tertiary" strokeWidth={1.6} />
          {fr ? "Prochains matchs" : "Upcoming matches"}
        </h2>
        <Link
          href="/matches?view=calendar"
          className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          {fr ? "Calendrier →" : "Calendar →"}
        </Link>
      </header>
      {matches.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-tertiary">
          {fr ? "Calendrier à venir." : "Schedule coming soon."}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {matches.map((m) => {
            const k = new Date(m.kickoff_at);
            const isToday = sameDay(k, new Date());
            const when = isToday
              ? k.toLocaleTimeString(fr ? "fr-CA" : "en-CA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Toronto",
                })
              : k.toLocaleDateString(fr ? "fr-CA" : "en-CA", {
                  day: "2-digit",
                  month: "short",
                });
            return (
              <li key={m.id}>
                <Link
                  href={`/matches/${m.id}`}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-white/[0.03]"
                >
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      isToday ? "font-bold text-primary-300" : "text-text-tertiary",
                    )}
                  >
                    {when}
                  </span>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="truncate font-medium text-text-secondary">
                      {teamName(m.home_team, m.home_placeholder, locale)}
                    </span>
                    <Flag isoCode={m.home_team?.iso_code ?? null} size="sm" />
                  </div>
                  <span className="text-xs text-text-tertiary">vs</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <Flag isoCode={m.away_team?.iso_code ?? null} size="sm" />
                    <span className="truncate font-medium text-text-secondary">
                      {teamName(m.away_team, m.away_placeholder, locale)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mini leaderboard                                                          */
/* -------------------------------------------------------------------------- */

function MiniLeaderboard({
  top5,
  myRow,
  currentUserId,
  total,
  locale,
}: {
  top5: StandingEntry[];
  myRow: StandingEntry | null;
  currentUserId: string | null;
  total: number;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <Card padded="none" accent="gold">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Image
            src="/assets/lucarne/exports/trophy-gold.png"
            alt=""
            width={28}
            height={28}
            className="size-6 rounded-sm"
          />
          {fr ? "Classement" : "Leaderboard"}
          {total > 0 && (
            <span className="font-mono text-[10px] text-text-tertiary">
              ({total})
            </span>
          )}
        </h2>
        <Link
          href="/leaderboard/global"
          className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          {fr ? "Tout voir →" : "View all →"}
        </Link>
      </header>
      {top5.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-tertiary">
          {fr
            ? "Le classement s'ouvre au 1ᵉʳ match résolu."
            : "Opens after the first settled match."}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {top5.map((r) => (
            <LeaderRow
              key={r.user_id}
              row={r}
              isMe={r.user_id === currentUserId}
              locale={locale}
            />
          ))}
          {myRow && (
            <li className="border-t-2 border-dashed border-white/[0.08]">
              <LeaderRow row={myRow} isMe locale={locale} />
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function LeaderRow({
  row,
  isMe,
  locale,
}: {
  row: StandingEntry;
  isMe: boolean;
  locale: Locale;
}) {
  const isAdmin = row.role === "admin" || row.role === "super_admin";
  return (
    <FlashRow
      as="div"
      points={row.total_points}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm",
        isAdmin && !isMe && "bg-gold-500/[0.06]",
        isMe && "bg-primary-500/[0.07]",
      )}
    >
      <RankBadge rank={row.rank} />
      <UserAvatar
        src={row.avatar_url}
        name={row.display_name ?? row.username}
        className={cn(
          "size-7 ring-1",
          row.rank === 1 ? "ring-gold-500/35" : "ring-white/[0.1]",
        )}
        fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[10px] font-bold text-text-primary"
      />
      <Link
        href={`/u/${row.username}`}
        className={cn(
          "min-w-0 flex-1 truncate text-xs transition hover:underline",
          isMe
            ? "font-bold text-primary-300"
            : "font-semibold text-text-secondary hover:text-text-primary",
        )}
      >
        @{row.username}
        {isMe && (
          <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-400">
            {locale === "fr" ? "Toi" : "You"}
          </span>
        )}
        {isAdmin && (
          <span className="ml-1.5 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-500/30">
            Admin
          </span>
        )}
      </Link>
      <span
        className={cn(
          "font-display text-sm font-bold tabular-nums",
          row.rank === 1 ? "text-gold-300" : "text-text-secondary",
        )}
      >
        {row.total_points}
        <span className="ml-0.5 text-[9px] font-medium text-text-tertiary">
          pts
        </span>
      </span>
    </FlashRow>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-gold-500/15 ring-1 ring-gold-500/35">
        <Crown className="size-3 text-gold-300" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold tabular-nums",
        rank <= 3
          ? "bg-white/[0.08] text-text-primary ring-1 ring-white/[0.12]"
          : "text-text-tertiary",
      )}
    >
      {rank}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Leagues + tickets                                                         */
/* -------------------------------------------------------------------------- */

function LeaguesCard({
  leagues,
  locale,
}: {
  leagues: Awaited<ReturnType<typeof listMyLeagues>>;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <Card padded="none">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Users className="size-4 text-text-tertiary" strokeWidth={1.6} />
          {fr ? "Mes ligues" : "My leagues"}
        </h2>
        {leagues.length > 0 && (
          <Link
            href="/leagues"
            className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
          >
            {fr ? "Voir tout →" : "View all →"}
          </Link>
        )}
      </header>
      {leagues.length === 0 ? (
        <Link
          href="/leagues/new"
          className="m-3 block rounded-sm border border-dashed border-white/[0.12] p-4 text-center text-sm text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary"
        >
          {fr ? "+ Crée ta première ligue" : "+ Create your first league"}
        </Link>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {leagues.slice(0, 3).map((l) => (
            <li key={l.id}>
              <Link
                href={`/leagues/${l.slug}`}
                className="group flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-primary">
                    {l.name}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {l.member_count}
                    {l.member_limit ? `/${l.member_limit}` : ""}{" "}
                    {fr ? "membres" : "members"}
                  </div>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
                  strokeWidth={1.6}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TicketsCard({
  bets,
  locale,
}: {
  bets: Awaited<ReturnType<typeof listMyBets>>;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <Card padded="none">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <Ticket className="size-4 text-text-tertiary" strokeWidth={1.6} />
          {fr ? "Tickets récents" : "Recent tickets"}
        </h2>
        {bets.length > 0 && (
          <Link
            href="/bets"
            className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
          >
            {fr ? "Tous →" : "All →"}
          </Link>
        )}
      </header>
      {bets.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-tertiary">
          <Sparkles className="mx-auto mb-2 size-5 text-text-tertiary" strokeWidth={1.5} />
          {fr ? "Pas encore de prono." : "No prediction yet."}
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {bets.slice(0, 4).map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">
                  {betLabel(b, locale)}
                </div>
                <div className="text-xs text-text-tertiary">
                  {b.status === "settled"
                    ? `${b.points ?? 0} pts`
                    : fr
                      ? "En attente"
                      : "Pending"}
                </div>
              </div>
              <BetStatusBadge status={b.status} result={b.result} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quick actions + feature cards                                             */
/* -------------------------------------------------------------------------- */

const ACTION_ACCENT: Record<"primary" | "violet" | "gold", string> = {
  primary: "bg-primary-500/15 text-primary-300 ring-primary-500/30",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  gold: "bg-gold-500/15 text-gold-300 ring-gold-500/35",
};

function QuickActions({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const actions: {
    href: string;
    icon: LucideIcon;
    label: string;
    sub: string;
    accent: "primary" | "violet" | "gold";
  }[] = [
    {
      href: "/predict",
      icon: Sparkles,
      label: fr ? "Pronostiquer" : "Predict",
      sub: fr ? "Groupes + phase finale" : "Groups + bracket",
      accent: "primary",
    },
    {
      href: "/matches",
      icon: CalendarDays,
      label: fr ? "Calendrier" : "Calendar",
      sub: fr ? "Les 104 matchs" : "All 104 fixtures",
      accent: "violet",
    },
    {
      href: "/leagues",
      icon: Users,
      label: fr ? "Inviter des amis" : "Invite friends",
      sub: fr ? "Ligues privées" : "Private leagues",
      accent: "gold",
    },
    {
      href: "/how-it-works",
      icon: HelpCircle,
      label: fr ? "Comment ça marche" : "How it works",
      sub: fr ? "Règles + points" : "Rules + scoring",
      accent: "primary",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Card key={a.href} href={a.href} padded="md" className="group">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-sm ring-1",
                  ACTION_ACCENT[a.accent],
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-semibold text-text-primary">
                  {a.label}
                </div>
                <div className="truncate text-xs text-text-tertiary">
                  {a.sub}
                </div>
              </div>
              <ArrowRight
                className="ml-auto size-4 shrink-0 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
                strokeWidth={1.6}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ChampionCard({
  team,
  canBet,
  locale,
}: {
  team: { name_fr: string; name_en: string; iso_code: string | null } | null;
  canBet: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <Card accent="gold" padded="lg" className="relative overflow-hidden">
      <Image
        src="/assets/lucarne/exports/bracket-network.png"
        alt=""
        width={110}
        height={110}
        className="pointer-events-none absolute -bottom-3 -right-3 size-24 opacity-20"
      />
      <div className="relative">
        <Badge tone="gold" icon={Crown}>
          {fr ? "Ton champion" : "Your champion"}
        </Badge>
        {team ? (
          <div className="mt-4 flex items-center gap-3">
            <Flag isoCode={team.iso_code} size="xl" />
            <div className="min-w-0">
              <div className="truncate font-display text-xl font-bold text-text-primary">
                {fr ? team.name_fr : team.name_en}
              </div>
              <div className="text-xs text-text-tertiary">
                {fr
                  ? "Vainqueur prédit du Mondial"
                  : "Predicted World Cup winner"}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {fr
                ? "Qui soulèvera le trophée ? Désigne ton champion en bâtissant ta phase finale."
                : "Who lifts the trophy? Crown your champion by building your bracket."}
            </p>
            <Button
              href={canBet ? "/predict?tab=finale" : "/buy-in"}
              variant="gold"
              size="md"
              iconRight={ArrowRight}
              className="mt-4"
            >
              {fr ? "Choisir mon champion" : "Pick my champion"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function CagnotteCard({
  amountCents,
  currency,
  shares,
  rakePct,
  locale,
}: {
  amountCents: number;
  currency: string;
  shares: number[];
  rakePct: number;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const amount = (amountCents / 100).toLocaleString(fr ? "fr-CA" : "en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  const redistributed = 100 - (rakePct ?? 0);
  const podium = shares.slice(0, 3);
  return (
    <Card accent="primary" padded="lg" className="relative overflow-hidden">
      <Image
        src="/assets/lucarne/exports/trophy-gold.png"
        alt=""
        width={96}
        height={96}
        className="pointer-events-none absolute -right-2 -top-2 size-20 opacity-25"
      />
      <div className="relative">
        <Badge tone="primary" icon={Coins}>
          {fr ? "La cagnotte" : "The pot"}
        </Badge>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
            {amount}
          </span>
          <span className="text-xs text-text-tertiary">
            / {fr ? "joueur" : "player"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          {fr
            ? `Un pot commun du groupe : ${redistributed}% des accès l'alimentent (les ${rakePct}% restants couvrent Stripe et l'hébergement). En fin de tournoi, il récompense les meilleurs — entre amis. Plus on est nombreux, plus il grossit.`
            : `A shared group pot: ${redistributed}% of access fees fund it (the other ${rakePct}% covers Stripe + hosting). At the end, it rewards the best — among friends. The more of us, the bigger it gets.`}
        </p>
        {podium.length > 0 && (
          <div className="mt-4 flex gap-2">
            {podium.map((pct, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center rounded-sm border border-border-subtle bg-white/[0.03] py-2"
              >
                <span
                  className={cn(
                    "font-display text-sm font-bold tabular-nums",
                    i === 0
                      ? "text-gold-300"
                      : i === 1
                        ? "text-text-primary"
                        : "text-amber-400",
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-[10px] tabular-nums text-text-tertiary">
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function TournamentCard({
  startAt,
  locale,
}: {
  startAt: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const facts: { value: string; label: string }[] = [
    { value: "48", label: fr ? "équipes" : "teams" },
    { value: "104", label: fr ? "matchs" : "matches" },
    { value: "16", label: fr ? "villes" : "cities" },
  ];
  return (
    <Card accent="violet" padded="lg" className="relative overflow-hidden">
      <Badge tone="violet" icon={Globe}>
        {fr ? "Le Mondial 2026" : "World Cup 2026"}
      </Badge>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {facts.map((f) => (
          <div
            key={f.label}
            className="rounded-sm border border-border-subtle bg-white/[0.03] py-2.5 text-center"
          >
            <div className="font-display text-xl font-bold tabular-nums text-text-primary">
              {f.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              {f.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <LockCountdown
          targetAt={startAt}
          locale={locale}
          prefix={{ fr: "Coup d'envoi dans", en: "Kicks off in" }}
          pastLabel={{ fr: "Tournoi en cours", en: "Tournament live" }}
        />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function teamName(
  team: { name_fr: string; name_en: string } | null,
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? "—";
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function betLabel(
  bet: {
    bet_type: string;
    match: {
      home_team: { name_fr: string; name_en: string } | null;
      away_team: { name_fr: string; name_en: string } | null;
    } | null;
  },
  locale: Locale,
): string {
  if (!bet.match) return bet.bet_type;
  const home = bet.match.home_team
    ? locale === "fr"
      ? bet.match.home_team.name_fr
      : bet.match.home_team.name_en
    : "?";
  const away = bet.match.away_team
    ? locale === "fr"
      ? bet.match.away_team.name_fr
      : bet.match.away_team.name_en
    : "?";
  return `${home} – ${away}`;
}
