import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getMyStats } from "@/lib/profile/stats";
import { listMatches, type MatchListItem } from "@/lib/matches/queries";
import { listMyBets } from "@/lib/bets/queries";
import { getGlobalStandings, listMyLeagues } from "@/lib/leagues/queries";
import { getCommunityOdds, shareToOdds } from "@/lib/bets/community-odds";
import { getMyPicksByMatch, type MyPick } from "@/lib/bets/my-picks";
import { picksToExisting } from "@/lib/bets/picks-to-existing";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { LockCountdown } from "@/components/ui/lock-countdown";
import {
  Cockpit,
  TrophyModeCard,
  type PredictionTicket,
  type BracketCell,
  type StandingRow,
} from "@/components/dashboard/cockpit";
import { WorldTrophyMark } from "@/components/brand/sport-icons";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { BetStatusBadge } from "@/components/bet/bet-status-badge";
import {
  ArrowRight,
  CalendarClock,
  Coins,
  Crown,
  Link2,
  Receipt,
  Sparkles,
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
  ] = await Promise.all([
    getCurrentUser(),
    getMyStats(),
    listMatches(),
    listMyBets(),
    listMyLeagues(),
    getGlobalStandings(6),
    getMyPicksByMatch(),
    getMyBuyInStatus(),
  ]);

  const now = Date.now();
  const liveMatches = allMatches.filter((m) => m.status === "live");
  const scheduledMatches = allMatches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        new Date(m.kickoff_at).getTime() > now + 60_000,
    )
    .slice(0, 4);

  // 4 prediction tickets: live first, then scheduled.
  const ticketCandidates = [...liveMatches, ...scheduledMatches].slice(0, 4);
  const communityOdds = await getCommunityOdds(
    ticketCandidates.map((m) => m.id),
  );

  const tickets: PredictionTicket[] = ticketCandidates.map((m, idx) => {
    const odds = communityOdds.get(m.id) ?? { home: 38, draw: 24, away: 38, total: 0 };
    const accent: PredictionTicket["accent"] =
      m.status === "live"
        ? "violet"
        : idx === 0
          ? "primary"
          : idx === 1
            ? "gold"
            : idx === 2
              ? "emerald"
              : "primary";
    return {
      match: {
        id: m.id,
        kickoff_at: m.kickoff_at,
        status: m.status,
        home_team: m.home_team
          ? {
              iso_code: m.home_team.iso_code ?? null,
              name_fr: m.home_team.name_fr,
              name_en: m.home_team.name_en,
              flag_emoji: m.home_team.flag_emoji ?? null,
            }
          : null,
        away_team: m.away_team
          ? {
              iso_code: m.away_team.iso_code ?? null,
              name_fr: m.away_team.name_fr,
              name_en: m.away_team.name_en,
              flag_emoji: m.away_team.flag_emoji ?? null,
            }
          : null,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      },
      label: ticketLabel(m, idx, L),
      stage:
        m.stage === "group" && m.group_label
          ? `${L === "fr" ? "Groupe" : "Group"} ${m.group_label}`
          : stageName(m.stage, L),
      venue: m.venue
        ? `${L === "fr" ? m.venue.city_fr : m.venue.city_en} · ${m.venue.name}`
        : ticketLabel(m, idx, L),
      time: new Date(m.kickoff_at).toLocaleString(
        L === "fr" ? "fr-FR" : "en-US",
        { day: "2-digit", month: "short", timeZone: "Europe/Paris" },
      ),
      accent,
      shares: [odds.home, odds.draw, odds.away],
      odds: [
        shareToOdds(odds.home),
        shareToOdds(odds.draw),
        shareToOdds(odds.away),
      ],
    };
  });

  // Build standings rows (max 4 for cockpit display)
  const standingRows: StandingRow[] = standings.slice(0, 4).map((s) => ({
    rank: s.rank,
    name: s.display_name ?? `@${s.username}`,
    wins: s.wins,
    points: s.total_points,
    isMe: user?.id === s.user_id,
  }));

  // Build bracket preview (3 cols × ~3 cells)
  const bracket = buildBracketPreview(allMatches, L);

  // Real metrics for rings
  const activeBets = myBets.filter((b) => b.status === "validated");
  const activeStake = activeBets.reduce(
    (sum, b) => sum + b.stake_cents,
    0,
  );
  const balanceCents = user?.balance_cents ?? 0;
  const totalCapital = activeStake + balanceCents;
  const riskPct =
    totalCapital > 0 ? Math.round((activeStake / totalCapital) * 100) : 0;
  const roiPct =
    stats.total_staked_cents > 0
      ? Math.round(
          ((stats.total_payout_cents - stats.total_staked_cents) /
            stats.total_staked_cents) *
            100,
        )
      : 0;
  const goldPct = Math.round(stats.win_rate * 100);

  // Form curve: cumulative points over last settled bets (or flat zeros)
  const settledBets = myBets
    .filter((b) => b.status === "settled")
    .slice(0, 12)
    .reverse();
  const formPoints =
    settledBets.length > 0
      ? settledBets.reduce<number[]>((acc, b, i) => {
          const prev = i === 0 ? 0 : acc[i - 1]!;
          acc.push(prev + b.points);
          return acc;
        }, [])
      : [0, 0, 0, 0, 0];

  const finishedCount = allMatches.filter((m) => m.status === "finished").length;
  const donutValue = Math.min(
    Math.round((finishedCount / Math.max(allMatches.length, 1)) * 100),
    100,
  );

  // Page-level metrics
  const balanceTokens = Math.floor(balanceCents / 100);
  const winRatePct = Math.round(stats.win_rate * 100);
  const myRank =
    user && standings.find((s) => s.user_id === user.id)?.rank;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {!buyIn.can_bet && (
        <BuyInBanner
          amountCents={buyIn.amount_cents}
          currency={buyIn.settings.currency}
          deadlineAt={buyIn.deadline_at}
          deadlinePassed={buyIn.deadline_passed}
          locale={L}
        />
      )}
      <section className="relative overflow-hidden rounded-[12px] border border-white/[0.13] bg-abyss/[0.78] shadow-[0_38px_120px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1600px"
          priority
          className="absolute inset-0 -z-20 object-cover object-[55%_45%] opacity-[0.42]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.93)_0%,rgba(5,6,5,0.78)_38%,rgba(5,6,5,0.46)_100%)]" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "54px 54px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
          }}
        />

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.62fr_1.38fr] lg:p-8">
          {/* Left side — greeting + trophy mode + 4 stats */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
                  <WorldTrophyMark className="size-3.5" />
                  {L === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
                </div>
                <LockCountdown
                  targetAt={buyIn.settings.tournament_start_at}
                  locale={L}
                  prefix={{
                    fr: "Coup d'envoi dans",
                    en: "Kicks off in",
                  }}
                  pastLabel={{
                    fr: "Tournoi en cours",
                    en: "Tournament live",
                  }}
                />
              </div>
              <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl lg:text-5xl">
                {L === "fr" ? "Salut" : "Hey"}
                {user?.display_name ? `, ${user.display_name.split(" ")[0]}` : ""}.
                <br />
                {L === "fr" ? "Voici ton dashboard Mondial." : "Here's your World Cup dashboard."}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
                {L === "fr"
                  ? "Console live, classement, organigramme et stats — tout pour piloter ton tournoi."
                  : "Live console, leaderboard, bracket, and stats — everything to drive your tournament."}
              </p>
            </div>

            <TrophyModeCard locale={L} />

            <div className="grid grid-cols-2 gap-3">
              <CommandMetric
                icon={Link2}
                label={L === "fr" ? "Solde" : "Balance"}
                value={balanceTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")}
                detail={L === "fr" ? "jetons dispo" : "tokens ready"}
                accent="primary"
                href="/profile/wallet"
              />
              <CommandMetric
                icon={Receipt}
                label={L === "fr" ? "Paris actifs" : "Active bets"}
                value={activeBets.length}
                detail={`${Math.floor(activeStake / 100)} ${L === "fr" ? "jetons" : "tokens"}`}
                accent="violet"
                href="/bets"
              />
              <CommandMetric
                icon={Crown}
                label={L === "fr" ? "Points" : "Points"}
                value={stats.total_points}
                detail={
                  stats.settled_bets > 0
                    ? `${winRatePct}% ${L === "fr" ? "réussite" : "win rate"}`
                    : L === "fr"
                      ? "en attente"
                      : "pending"
                }
                accent="gold"
                href="/leaderboard/global"
              />
              <CommandMetric
                icon={Users}
                label={L === "fr" ? "Ligues" : "Leagues"}
                value={myLeagues.length}
                detail={
                  myRank
                    ? `${L === "fr" ? "rang" : "rank"} #${myRank}`
                    : L === "fr"
                      ? "espaces privés"
                      : "private rooms"
                }
                accent="primary"
                href="/leagues"
              />
            </div>
          </div>

          {/* Right side — cockpit */}
          <Cockpit
            locale={L}
            tickets={tickets}
            standings={standingRows}
            bracket={bracket}
            rings={[
              { label: "ROI", value: clampRing(roiPct + 50), color: "primary" },
              {
                label: L === "fr" ? "Risque" : "Risk",
                value: riskPct,
                color: "violet",
              },
              { label: "Gold", value: goldPct, color: "gold" },
            ]}
            donutValue={donutValue}
            donutLabel={
              L === "fr"
                ? `${finishedCount}/${allMatches.length} matchs`
                : `${finishedCount}/${allMatches.length} matches`
            }
            formPoints={formPoints}
          />
        </div>
      </section>

      {/* "Where do I start" — two-step prediction journey: bracket first
         (strategic, one-time), per-match picks second (tactical, ongoing). */}
      {(() => {
        const openCount = allMatches.filter(
          (m) =>
            m.status === "scheduled" &&
            new Date(m.kickoff_at).getTime() - now > 60 * 60_000,
        ).length;
        const picksDone = Array.from(myPicksByMatch.entries()).filter(
          ([, picks]) =>
            picks.some(
              (p) =>
                p.bet_type === "match_winner" && p.status === "validated",
            ),
        ).length;
        return (
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <BracketLaunchCard locale={L} canBet={buyIn.can_bet} />
            <PicksLaunchCard
              locale={L}
              canBet={buyIn.can_bet}
              openCount={openCount}
              picksDone={picksDone}
            />
          </section>
        );
      })()}

      {/* Featured upcoming + my activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionHeader
            icon={CalendarClock}
            title={L === "fr" ? "Match en vedette" : "Featured match"}
            href="/matches"
            linkLabel={L === "fr" ? "Tous les matchs" : "All matches"}
          />
          {ticketCandidates[0] ? (
            <FeaturedActionCard
              match={ticketCandidates[0]}
              locale={L}
              myPicks={myPicksByMatch.get(ticketCandidates[0].id)}
              canBet={buyIn.can_bet}
            />
          ) : (
            <EmptyPanel
              text={
                L === "fr"
                  ? "Aucun match ouvert pour le moment."
                  : "No open match right now."
              }
            />
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <SectionHeader
              icon={Receipt}
              title={L === "fr" ? "Tickets récents" : "Recent tickets"}
              href="/bets"
              linkLabel={L === "fr" ? "Tous" : "All"}
            />
            {myBets.length === 0 ? (
              <EmptyPanel
                text={
                  L === "fr"
                    ? "Pas encore de pari."
                    : "No bet yet."
                }
              />
            ) : (
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
                {myBets.slice(0, 4).map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {betLabel(b, L)}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {Math.floor(b.stake_cents / 100)}{" "}
                        {L === "fr" ? "jetons" : "tokens"}
                      </div>
                    </div>
                    <BetStatusBadge
                      status={b.status}
                      result={b.result}
                      locale={L}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader
              icon={Users}
              title={L === "fr" ? "Mes ligues" : "My leagues"}
              href="/leagues"
              linkLabel={L === "fr" ? "Voir tout" : "View all"}
            />
            {myLeagues.length === 0 ? (
              <Link
                href="/leagues/new"
                className="block rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-5 text-center text-sm text-text-secondary transition hover:border-primary-500/40 hover:bg-surface-1/[0.6] hover:text-text-primary"
              >
                {L === "fr"
                  ? "Crée ta première ligue"
                  : "Create your first league"}
              </Link>
            ) : (
              <ul className="space-y-2">
                {myLeagues.slice(0, 3).map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/leagues/${l.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] px-4 py-3 backdrop-blur-xl transition hover:border-primary-500/35 hover:bg-surface-2/[0.6]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-text-primary">
                          {l.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {l.member_count}/{l.member_limit}{" "}
                          {L === "fr" ? "membres" : "members"}
                        </div>
                      </div>
                      <ArrowRight
                        className="size-4 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
                        strokeWidth={1.5}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function CommandMetric({
  icon: Icon,
  label,
  value,
  detail,
  accent,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail: string;
  accent: "primary" | "gold" | "violet";
  href?: string;
}) {
  const colors = {
    primary: { bg: "bg-primary-500/12 ring-primary-500/30", text: "text-primary-400" },
    gold: { bg: "bg-gold-500/12 ring-gold-500/30", text: "text-gold-400" },
    violet: { bg: "bg-violet-500/12 ring-violet-500/30", text: "text-violet-400" },
  }[accent];

  const inner = (
    <div className="group relative overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl transition hover:border-white/[0.16] hover:bg-white/[0.07]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={cn("rounded-md p-1.5 ring-1", colors.bg)}>
          <Icon className={cn("size-3.5", colors.text)} strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{detail}</div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function FeaturedActionCard({
  match,
  locale,
  myPicks,
  canBet,
}: {
  match: MatchListItem;
  locale: Locale;
  myPicks?: MyPick[];
  canBet: boolean;
}) {
  const homeName = match.home_team
    ? locale === "fr"
      ? match.home_team.name_fr
      : match.home_team.name_en
    : match.home_placeholder ?? "?";
  const awayName = match.away_team
    ? locale === "fr"
      ? match.away_team.name_fr
      : match.away_team.name_en
    : match.away_placeholder ?? "?";
  const kickoff = new Date(match.kickoff_at).toLocaleString(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    },
  );
  const hasPick =
    myPicks?.some((p) => p.status === "validated") ?? false;
  return (
    <div className="rounded-[12px] border border-primary-500/25 bg-gradient-to-br from-primary-500/[0.1] via-gold-500/[0.04] to-transparent p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
          {locale === "fr" ? "Prochain coup d'envoi" : "Next kickoff"}
        </p>
        <p className="font-mono text-xs tabular-nums text-text-secondary">
          {kickoff}
        </p>
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        {homeName} <span className="text-text-tertiary">vs</span> {awayName}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1 sm:flex-none">
          <QuickBetButton
            match={{
              id: match.id,
              kickoff_at: match.kickoff_at,
              status: match.status,
              home_team: match.home_team
                ? {
                    iso_code: match.home_team.iso_code ?? null,
                    name_fr: match.home_team.name_fr,
                    name_en: match.home_team.name_en,
                    flag_emoji: match.home_team.flag_emoji ?? null,
                  }
                : null,
              away_team: match.away_team
                ? {
                    iso_code: match.away_team.iso_code ?? null,
                    name_fr: match.away_team.name_fr,
                    name_en: match.away_team.name_en,
                    flag_emoji: match.away_team.flag_emoji ?? null,
                  }
                : null,
              home_placeholder: match.home_placeholder,
              away_placeholder: match.away_placeholder,
            }}
            locale={locale}
            variant="block"
            hasPick={hasPick}
            existing={picksToExisting(myPicks)}
            canBet={canBet}
          />
        </div>
        <Link
          href={`/matches/${match.id}`}
          className="rounded-[8px] border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-white/[0.2] hover:text-text-primary"
        >
          {locale === "fr" ? "Voir le match" : "Match detail"}
        </Link>
      </div>
    </div>
  );
}

function BracketLaunchCard({
  locale,
  canBet,
}: {
  locale: Locale;
  canBet: boolean;
}) {
  const href = canBet ? "/predict?tab=finale" : "/buy-in";
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[14px] border border-gold-500/40 bg-gradient-to-br from-gold-500/[0.18] via-primary-500/[0.06] to-transparent p-5 backdrop-blur-xl transition hover:border-gold-500/60 sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-gold-500/25 blur-3xl transition group-hover:scale-110"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-gold-500/45 bg-gold-500/15 text-gold-300 shadow-glow-gold">
            <Trophy className="size-6" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {locale === "fr" ? "Phase finale" : "Knockouts"}
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
              {locale === "fr"
                ? "Bâtis ton arbre jusqu'au champion"
                : "Build your bracket to the champion"}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-text-secondary">
              {canBet
                ? locale === "fr"
                  ? "Avance chaque équipe de tour en tour, R32 → finale. Verrouillé 1 h avant le 1ᵉʳ match."
                  : "Advance each team round by round, R32 → final. Locked 1 h before kickoff."
                : locale === "fr"
                  ? "Achète ta place pour débloquer la prédiction."
                  : "Buy your seat to unlock the prediction."}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-gold-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-gold transition group-hover:bg-gold-400">
            {canBet
              ? locale === "fr"
                ? "Construire"
                : "Build it"
              : locale === "fr"
                ? "Acheter ma place"
                : "Buy my seat"}
            <ArrowRight
              className="size-4 transition group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PicksLaunchCard({
  locale,
  canBet,
  openCount,
  picksDone,
}: {
  locale: Locale;
  canBet: boolean;
  openCount: number;
  picksDone: number;
}) {
  const remaining = Math.max(openCount - picksDone, 0);
  const pct = openCount > 0 ? Math.round((picksDone / openCount) * 100) : 0;
  const href = canBet ? "/predict?tab=groupes" : "/buy-in";

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[14px] border border-gold-500/35 bg-gradient-to-br from-gold-500/[0.16] via-primary-500/[0.08] to-transparent p-5 backdrop-blur-xl transition hover:border-gold-500/55 sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-gold-500/20 blur-3xl transition group-hover:scale-110"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold">
            <Sparkles className="size-6" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary-300">
              {locale === "fr" ? "Phase de groupes" : "Group phase"}
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
              {locale === "fr"
                ? "Classe les groupes + pronos match"
                : "Rank groups + per-match picks"}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-text-secondary">
              {canBet
                ? remaining > 0
                  ? locale === "fr"
                    ? `Il te reste ${remaining} match${remaining > 1 ? "s" : ""} à pronostiquer. Un clic par match — tout est sauvegardé tout seul.`
                    : `${remaining} match${remaining > 1 ? "es" : ""} left to pick. One tap each — auto-saved.`
                  : locale === "fr"
                    ? "Tu as pronostiqué tous les matchs ouverts. Affine tes pronos jusqu'à 1 h avant chaque coup d'envoi."
                    : "Every open match is picked. Tune your calls up to 1 h before each kickoff."
                : locale === "fr"
                  ? "Achète ta place pour débloquer le board pronos sur les 104 matchs."
                  : "Buy your seat to unlock the pick'em board for all 104 matches."}
            </p>
            {canBet && openCount > 0 && (
              <div className="mt-3 max-w-md">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  <span>
                    {picksDone}/{openCount}{" "}
                    {locale === "fr" ? "pronos" : "picks"}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-gold-400 transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-2 rounded-[10px] bg-gold-500 px-5 py-3 text-sm font-bold text-abyss shadow-glow-gold transition group-hover:bg-gold-400">
            {canBet
              ? locale === "fr"
                ? "Ouvrir le board"
                : "Open board"
              : locale === "fr"
                ? "Acheter ma place"
                : "Buy my seat"}
            <ArrowRight
              className="size-4 transition group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  linkLabel,
}: {
  icon: LucideIcon;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-text-primary">
        <Icon className="size-4 text-text-tertiary" strokeWidth={1.5} />
        {title}
      </h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-6 text-center text-sm text-text-secondary backdrop-blur-xl">
      {text}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

function clampRing(value: number): number {
  return Math.max(0, Math.min(value, 100));
}

function ticketLabel(match: MatchListItem, idx: number, locale: Locale): string {
  if (match.status === "live") return locale === "fr" ? "Live" : "Live";
  if (idx === 0) return locale === "fr" ? "Match d'ouverture" : "Opening match";
  if (idx === 1) return locale === "fr" ? "Affiche premium" : "Premium fixture";
  if (idx === 2) return locale === "fr" ? "Duel tactique" : "Tactical duel";
  if (match.stage === "final") return locale === "fr" ? "Finale gold" : "Gold final";
  return locale === "fr" ? "Prochain match" : "Upcoming match";
}

function stageName(stage: string, locale: Locale): string {
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16ᵉ", en: "R32" },
    r16: { fr: "8ᵉ", en: "R16" },
    qf: { fr: "Quart", en: "QF" },
    sf: { fr: "Demi", en: "SF" },
    third_place: { fr: "3ᵉ place", en: "3rd place" },
    final: { fr: "Finale", en: "Final" },
    group: { fr: "Groupes", en: "Group" },
  };
  return labels[stage]?.[locale] ?? stage;
}

function buildBracketPreview(
  matches: MatchListItem[],
  _locale: Locale,
): BracketCell[][] {
  const r32 = matches.filter((m) => m.stage === "r32").slice(0, 4);
  const r16 = matches.filter((m) => m.stage === "r16").slice(0, 4);
  const qf = matches.filter((m) => m.stage === "qf").slice(0, 2);

  function teamCode(team: { iso_code: string | null } | null, placeholder: string | null): string | null {
    if (team?.iso_code) return team.iso_code.toUpperCase();
    if (placeholder) return placeholder.slice(0, 8);
    return null;
  }

  function fillStage(
    stageKey: BracketCell["stageKey"],
    list: MatchListItem[],
    count: number,
  ): BracketCell[] {
    const cells: BracketCell[] = list.map((m) => ({
      stageKey,
      homeCode: teamCode(m.home_team, m.home_placeholder),
      awayCode: teamCode(m.away_team, m.away_placeholder),
    }));
    while (cells.length < count) {
      cells.push({ stageKey, homeCode: null, awayCode: null });
    }
    return cells;
  }

  return [
    fillStage("r32", r32, 4),
    fillStage("r16", r16, 4),
    fillStage("qf", qf, 2),
  ];
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
