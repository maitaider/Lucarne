import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getMyStats } from "@/lib/profile/stats";
import { listMatches } from "@/lib/matches/queries";
import { listMyBets } from "@/lib/bets/queries";
import { getGlobalStandings, listMyLeagues } from "@/lib/leagues/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { LockCountdown } from "@/components/ui/lock-countdown";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { WorldTrophyMark } from "@/components/brand/sport-icons";
import { BetStatusBadge } from "@/components/bet/bet-status-badge";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ArrowRight,
  Coins,
  Crown,
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
  const activeBets = myBets.filter((b) => b.status === "validated");
  const balanceTokens = Math.floor((user?.balance_cents ?? 0) / 100);
  const winRatePct = Math.round(stats.win_rate * 100);
  const myRank = user && standings.find((s) => s.user_id === user.id)?.rank;

  // Progress used by the single "next step" card.
  const openCount = allMatches.filter(
    (m) =>
      m.status === "scheduled" &&
      new Date(m.kickoff_at).getTime() - now > 60 * 60_000,
  ).length;
  const picksDone = Array.from(myPicksByMatch.values()).filter((picks) =>
    picks.some(
      (p) => p.bet_type === "match_winner" && p.status === "validated",
    ),
  ).length;

  const firstName = user?.display_name?.split(" ")[0] ?? "";

  return (
    <AppPageShell width="ultra">
      {!buyIn.can_bet && (
        <BuyInBanner
          amountCents={buyIn.amount_cents}
          currency={buyIn.settings.currency}
          deadlineAt={buyIn.deadline_at}
          deadlinePassed={buyIn.deadline_passed}
          locale={L}
        />
      )}

      {/* Compact hero: greeting + countdown + KPIs */}
      <section className="relative overflow-hidden rounded-md border border-border-subtle shadow-card">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1152px"
          priority
          className="absolute inset-0 -z-20 object-cover object-[55%_42%] opacity-[0.22]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(5,6,5,0.95)_0%,rgba(5,6,5,0.82)_46%,rgba(5,6,5,0.58)_100%)]" />
        <div className="relative p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="gold" size="lg">
              <WorldTrophyMark className="size-3.5" />
              {L === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
            </Badge>
            <LockCountdown
              targetAt={buyIn.settings.tournament_start_at}
              locale={L}
              prefix={{ fr: "Coup d'envoi dans", en: "Kicks off in" }}
              pastLabel={{ fr: "Tournoi en cours", en: "Tournament live" }}
            />
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight text-text-primary sm:text-3xl">
            {L === "fr" ? "Salut" : "Hey"}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "L'essentiel du Mondial, et ta prochaine action — sur une seule page."
              : "The World Cup essentials and your next move — on one page."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              icon={Coins}
              label={L === "fr" ? "Solde" : "Balance"}
              value={balanceTokens.toLocaleString(
                L === "fr" ? "fr-FR" : "en-US",
              )}
              detail={L === "fr" ? "jetons" : "tokens"}
              accent="primary"
              href="/profile/wallet"
            />
            <Stat
              icon={Receipt}
              label={L === "fr" ? "Pronos actifs" : "Active picks"}
              value={activeBets.length}
              detail={L === "fr" ? "à régler" : "open"}
              accent="violet"
              href="/bets"
            />
            <Stat
              icon={Crown}
              label={L === "fr" ? "Points" : "Points"}
              value={stats.total_points}
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
        </div>
      </section>

      {/* The ONE clear next step (state-aware). */}
      <NextStepCard
        locale={L}
        canBet={buyIn.can_bet}
        amountCents={buyIn.amount_cents}
        currency={buyIn.settings.currency}
        openCount={openCount}
        picksDone={picksDone}
      />

      {/* Today + community */}
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <TodayPanel
          matches={allMatches}
          standings={standings}
          currentUserId={user?.id ?? null}
          locale={L}
        />

        <aside className="flex flex-col gap-6">
          <section>
            <SectionHeader
              icon={Ticket}
              title={L === "fr" ? "Tickets récents" : "Recent tickets"}
              href="/bets"
              linkLabel={L === "fr" ? "Tous" : "All"}
            />
            {myBets.length === 0 ? (
              <EmptyHint
                text={L === "fr" ? "Pas encore de pari." : "No bet yet."}
              />
            ) : (
              <Card padded="none">
                <ul className="divide-y divide-white/[0.06]">
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
              </Card>
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
                className="block rounded-md border border-dashed border-white/[0.12] bg-surface-1 p-5 text-center text-sm text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary"
              >
                {L === "fr"
                  ? "Crée ta première ligue"
                  : "Create your first league"}
              </Link>
            ) : (
              <ul className="space-y-2">
                {myLeagues.slice(0, 3).map((l) => (
                  <li key={l.id}>
                    <Card href={`/leagues/${l.slug}`} padded="none">
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
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
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </AppPageShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  The single "next step" card                                               */
/* -------------------------------------------------------------------------- */

function NextStepCard({
  locale,
  canBet,
  amountCents,
  currency,
  openCount,
  picksDone,
}: {
  locale: Locale;
  canBet: boolean;
  amountCents: number;
  currency: string;
  openCount: number;
  picksDone: number;
}) {
  const fr = locale === "fr";
  const remaining = Math.max(openCount - picksDone, 0);

  // Resolve the one action that matters right now.
  let kicker: string;
  let title: string;
  let body: string;
  let ctaLabel: string;
  let ctaHref: string;
  let accent: "gold" | "primary" = "gold";
  let StepIcon: LucideIcon = Sparkles;

  if (!canBet) {
    const amount = (amountCents / 100).toLocaleString(fr ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    kicker = fr ? "Étape 1" : "Step 1";
    title = fr ? "Achète ta place pour jouer" : "Buy your seat to play";
    body = fr
      ? `${amount} une seule fois pour pronostiquer les 104 matchs et viser la cagnotte.`
      : `${amount} once to predict all 104 matches and play for the pot.`;
    ctaLabel = fr ? "Acheter ma place" : "Buy my seat";
    ctaHref = "/buy-in";
    StepIcon = Ticket;
  } else if (picksDone === 0) {
    kicker = fr ? "On commence" : "Let's go";
    title = fr ? "Fais ton premier prono" : "Make your first pick";
    body = fr
      ? "Classe les groupes et choisis tes vainqueurs — un clic par match, tout se sauvegarde tout seul."
      : "Rank the groups and pick your winners — one tap per match, auto-saved.";
    ctaLabel = fr ? "Commencer" : "Start";
    ctaHref = "/predict";
    StepIcon = Sparkles;
  } else if (remaining > 0) {
    kicker = fr ? "Continue" : "Keep going";
    title = fr
      ? `Il te reste ${remaining} match${remaining > 1 ? "s" : ""} à pronostiquer`
      : `${remaining} match${remaining > 1 ? "es" : ""} left to predict`;
    body = fr
      ? "Reprends là où tu t'es arrêté. Modifiable jusqu'à 1 h avant chaque coup d'envoi."
      : "Pick up where you left off. Editable up to 1 h before each kickoff.";
    ctaLabel = fr ? "Reprendre" : "Resume";
    ctaHref = "/predict";
    accent = "primary";
    StepIcon = Trophy;
  } else {
    kicker = fr ? "Bien joué" : "Nicely done";
    title = fr ? "Tous tes pronos sont posés" : "Every pick is in";
    body = fr
      ? "Ajuste-les quand tu veux avant le verrou, ou invite des amis dans une ligue privée."
      : "Tweak them anytime before the lock, or invite friends to a private league.";
    ctaLabel = fr ? "Voir mes pronos" : "Review my picks";
    ctaHref = "/predict";
    accent = "primary";
    StepIcon = Crown;
  }

  return (
    <Card accent={accent} padded="lg" className="relative overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 size-44 rounded-full blur-3xl",
          accent === "gold" ? "bg-gold-500/20" : "bg-primary-500/15",
        )}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-sm ring-1",
              accent === "gold"
                ? "bg-gold-500/15 text-gold-300 ring-gold-500/40"
                : "bg-primary-500/15 text-primary-300 ring-primary-500/40",
            )}
          >
            <StepIcon className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                accent === "gold" ? "text-gold-300" : "text-primary-300",
              )}
            >
              {kicker}
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-6 text-text-secondary">
              {body}
            </p>
            {canBet && openCount > 0 && (
              <ProgressBar
                value={picksDone}
                max={openCount}
                accent={accent === "gold" ? "gold" : "primary"}
                label={fr ? "Pronos posés" : "Picks placed"}
                className="mt-3 max-w-xs"
              />
            )}
          </div>
        </div>
        <Button
          href={ctaHref}
          variant={accent === "gold" ? "gold" : "primary"}
          size="lg"
          iconRight={ArrowRight}
          className="shrink-0"
        >
          {ctaLabel}
        </Button>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

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

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/[0.12] bg-surface-1 p-6 text-center text-sm text-text-secondary">
      {text}
    </div>
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
