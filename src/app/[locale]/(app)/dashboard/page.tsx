import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getMyStats } from "@/lib/profile/stats";
import { listMatches } from "@/lib/matches/queries";
import { listMyBets } from "@/lib/bets/queries";
import {
  getGlobalStandings,
  listMyLeagues,
} from "@/lib/leagues/queries";
import { MatchCard } from "@/components/match/match-card";
import { BetStatusBadge } from "@/components/bet/bet-status-badge";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { Flag } from "@/components/team/flag";
import { WorldTrophyMark } from "@/components/brand/sport-icons";
import {
  ArrowRight,
  CalendarClock,
  Coins,
  Crown,
  Receipt,
  Sparkles,
  Trophy,
  Users,
  Zap,
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

  const [user, stats, allMatches, myBets, myLeagues, globalStandings] =
    await Promise.all([
      getCurrentUser(),
      getMyStats(),
      listMatches(),
      listMyBets(),
      listMyLeagues(),
      getGlobalStandings(5),
    ]);

  const now = Date.now();
  const liveMatches = allMatches.filter((m) => m.status === "live");
  const upcomingMatches = allMatches
    .filter(
      (m) =>
        m.status === "scheduled" && new Date(m.kickoff_at).getTime() > now,
    )
    .slice(0, 6);
  const featuredMatch = liveMatches[0] ?? upcomingMatches[0] ?? null;
  const upcomingMatchesGrid = featuredMatch
    ? upcomingMatches.filter((m) => m.id !== featuredMatch.id).slice(0, 3)
    : upcomingMatches.slice(0, 3);
  const recentBets = myBets.slice(0, 4);
  const activeBets = myBets.filter((b) =>
    ["pending_payment", "paid", "validated"].includes(b.status),
  );

  const firstName = user?.display_name?.split(" ")[0] ?? user?.username ?? "";
  const balanceTokens = Math.floor((user?.balance_cents ?? 0) / 100);
  const winRatePct = Math.round(stats.win_rate * 100);
  const netTokens = Math.floor(stats.net_cents / 100);
  const myRank =
    user && globalStandings.find((s) => s.user_id === user.id)?.rank;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Hero greeting */}
      <HeroCard
        locale={L}
        firstName={firstName}
        balanceTokens={balanceTokens}
        liveCount={liveMatches.length}
      />

      {/* Stats grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label={L === "fr" ? "Solde" : "Balance"}
          value={balanceTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")}
          unit={L === "fr" ? "jetons" : "tokens"}
          accent="primary"
          href="/profile/wallet"
        />
        <StatCard
          icon={Receipt}
          label={L === "fr" ? "Paris actifs" : "Active bets"}
          value={String(activeBets.length)}
          unit={
            stats.total_bets > 0
              ? `${stats.total_bets} ${L === "fr" ? "au total" : "total"}`
              : L === "fr"
                ? "à placer"
                : "to place"
          }
          accent="violet"
          href="/bets"
        />
        <StatCard
          icon={Crown}
          label={L === "fr" ? "Points" : "Points"}
          value={stats.total_points.toLocaleString(
            L === "fr" ? "fr-FR" : "en-US",
          )}
          unit={
            stats.settled_bets > 0
              ? `${winRatePct}% ${L === "fr" ? "réussite" : "win rate"}`
              : L === "fr"
                ? "en attente"
                : "pending"
          }
          accent="gold"
          href="/leaderboard/global"
        />
        <StatCard
          icon={Trophy}
          label={L === "fr" ? "Rang global" : "Global rank"}
          value={myRank ? `#${myRank}` : "—"}
          unit={
            netTokens > 0
              ? `+${netTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")} ${L === "fr" ? "nets" : "net"}`
              : netTokens < 0
                ? `${netTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")} ${L === "fr" ? "nets" : "net"}`
                : L === "fr"
                  ? "tout à jouer"
                  : "wide open"
          }
          accent={netTokens >= 0 ? "primary" : "error"}
          href="/leaderboard/global"
        />
      </section>

      {/* Onboarding card if no bets */}
      {stats.total_bets === 0 && featuredMatch && (
        <OnboardingCard locale={L} balanceTokens={balanceTokens} />
      )}

      {/* Featured match — biggest CTA on page */}
      {featuredMatch && (
        <FeaturedMatchCard match={featuredMatch} locale={L} />
      )}

      {/* Two-column: upcoming + recent bets/leagues */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionHeader
            icon={CalendarClock}
            title={L === "fr" ? "Prochains matchs" : "Upcoming matches"}
            href="/matches?view=calendar"
            linkLabel={L === "fr" ? "Calendrier" : "Calendar"}
          />
          {upcomingMatchesGrid.length === 0 ? (
            <EmptyPanel
              text={L === "fr" ? "Aucun match programmé." : "No upcoming matches."}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingMatchesGrid.map((m) => (
                <MatchCard key={m.id} match={m} locale={L} />
              ))}
            </div>
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
            {recentBets.length === 0 ? (
              <EmptyPanel
                text={
                  L === "fr"
                    ? "Pas encore de pari. Lance-toi !"
                    : "No bet yet. Get started!"
                }
              />
            ) : (
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
                {recentBets.map((b) => (
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
              <EmptyLeaguePanel locale={L} />
            ) : (
              <ul className="space-y-2">
                {myLeagues.slice(0, 4).map((l) => (
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

function HeroCard({
  locale,
  firstName,
  balanceTokens,
  liveCount,
}: {
  locale: Locale;
  firstName: string;
  balanceTokens: number;
  liveCount: number;
}) {
  const greeting = greet(locale, firstName);
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-white/[0.1] bg-abyss/70 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
      <Image
        src="/marketing/lucarne-hero-stadium.jpg"
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 1100px"
        priority
        className="absolute inset-0 -z-10 object-cover object-[58%_45%] opacity-30"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgba(5,6,5,0.92)_0%,rgba(5,6,5,0.76)_40%,rgba(5,6,5,0.42)_100%)]" />
      <div className="flex flex-col gap-6 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-7">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
            <WorldTrophyMark className="size-3" />
            {locale === "fr" ? "Coupe du Monde 2026" : "FIFA World Cup 2026"}
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {locale === "fr"
              ? "Voici l'état de ton mondial."
              : "Here's your tournament dashboard."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {liveCount > 0 && (
            <Link
              href="/matches?view=calendar"
              className="hidden items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-300 transition hover:bg-violet-500/[0.18] sm:inline-flex"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
              </span>
              {liveCount} live
            </Link>
          )}
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {locale === "fr" ? "Solde" : "Balance"}
            </div>
            <div className="font-display text-3xl font-bold tabular-nums text-primary-400">
              {balanceTokens.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
              <span className="ml-1 text-xs font-medium text-text-secondary">
                {locale === "fr" ? "jetons" : "tokens"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedMatchCard({
  match,
  locale,
}: {
  match: Awaited<ReturnType<typeof listMatches>>[number];
  locale: Locale;
}) {
  const kickoff = new Date(match.kickoff_at);
  const isLive = match.status === "live";
  const kickoffStr = kickoff.toLocaleString(
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

  const stageLabel =
    match.stage === "group" && match.group_label
      ? `${locale === "fr" ? "Groupe" : "Group"} ${match.group_label}`
      : stageName(match.stage, locale);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[14px] border bg-gradient-to-br p-5 backdrop-blur-xl sm:p-6",
        isLive
          ? "border-violet-500/40 from-violet-500/[0.12] via-violet-500/[0.04] to-transparent shadow-glow-violet"
          : "border-white/[0.1] from-primary-500/[0.08] via-transparent to-gold-500/[0.05]",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              isLive
                ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                : "bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/30",
            )}
          >
            {isLive
              ? locale === "fr"
                ? "En direct"
                : "Live now"
              : locale === "fr"
                ? "Prochain match"
                : "Next match"}
          </span>
          <span className="text-xs font-medium text-text-tertiary">
            {stageLabel}
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-text-secondary">
          {kickoffStr}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <TeamSide
          team={match.home_team}
          placeholder={match.home_placeholder}
          score={match.home_score}
          showScore={isLive || match.status === "finished"}
          locale={locale}
          align="left"
          name={homeName}
        />
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-text-tertiary sm:text-3xl">
            VS
          </div>
        </div>
        <TeamSide
          team={match.away_team}
          placeholder={match.away_placeholder}
          score={match.away_score}
          showScore={isLive || match.status === "finished"}
          locale={locale}
          align="right"
          name={awayName}
        />
      </div>

      {!isLive && match.status === "scheduled" && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
          <p className="text-xs text-text-secondary">
            {locale === "fr"
              ? "Place ton pronostic en 1 clic — choisis le vainqueur."
              : "One-click bet — pick the winner."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/matches/${match.id}`}
              className="rounded-[8px] border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-text-secondary transition hover:border-white/[0.2] hover:text-text-primary"
            >
              {locale === "fr" ? "Détail" : "Details"}
            </Link>
            <div className="min-w-[200px] flex-1 sm:flex-none">
              <QuickBetButton
                match={match}
                locale={locale}
                variant="block"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TeamSide({
  team,
  score,
  showScore,
  align,
  name,
}: {
  team: { iso_code: string | null } | null;
  placeholder: string | null;
  score: number | null;
  showScore: boolean;
  locale: Locale;
  align: "left" | "right";
  name: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 sm:gap-4",
        align === "right" && "flex-row-reverse",
      )}
    >
      <Flag isoCode={team?.iso_code ?? null} size="2xl" />
      <div className={cn("min-w-0", align === "right" && "text-right")}>
        <div className="truncate font-display text-lg font-semibold tracking-tight text-text-primary sm:text-2xl">
          {name}
        </div>
        {showScore && (
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-primary-400 sm:text-4xl">
            {score ?? "—"}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  accent: "primary" | "gold" | "violet" | "error";
  href?: string;
}) {
  const colors = {
    primary: { ring: "bg-primary-500/12 ring-primary-500/30", text: "text-primary-400" },
    gold: { ring: "bg-gold-500/12 ring-gold-500/30", text: "text-gold-400" },
    violet: { ring: "bg-violet-500/12 ring-violet-500/30", text: "text-violet-400" },
    error: { ring: "bg-error/12 ring-error/30", text: "text-error" },
  }[accent];

  const inner = (
    <div className="group relative overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl transition hover:border-white/[0.16] hover:bg-surface-1/[0.7]">
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("rounded-md p-1.5 ring-1", colors.ring)}>
          <Icon className={cn("size-4", colors.text)} strokeWidth={1.5} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
      </div>
      <div className="font-display text-3xl font-bold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{unit}</div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
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

function EmptyLeaguePanel({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-5 text-center backdrop-blur-xl">
      <p className="text-sm text-text-secondary">
        {locale === "fr"
          ? "Tu n'es dans aucune ligue."
          : "You're not in any league yet."}
      </p>
      <Link
        href="/leagues/new"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-400 ring-1 ring-primary-500/30 transition hover:bg-primary-500/25"
      >
        {locale === "fr" ? "Créer une ligue" : "Create a league"}
        <ArrowRight className="size-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}

function OnboardingCard({
  locale,
  balanceTokens,
}: {
  locale: Locale;
  balanceTokens: number;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.12] via-primary-500/[0.06] to-transparent p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-gold-500/15 p-2.5 ring-1 ring-gold-500/30">
            <Sparkles className="size-5 text-gold-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {locale === "fr"
                ? "Premier pronostic à placer"
                : "Place your first bet"}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-text-secondary">
              {locale === "fr"
                ? `Tu as ${balanceTokens.toLocaleString("fr-FR")} jetons. Choisis un match à venir et clique sur "Pronostiquer" pour parier en moins de 10 secondes.`
                : `You have ${balanceTokens.toLocaleString("en-US")} tokens. Pick a match and tap "Quick bet" to place your bet in under 10 seconds.`}
            </p>
          </div>
        </div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2.5 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
        >
          <Zap className="size-4" strokeWidth={2.5} />
          {locale === "fr" ? "Voir les matchs" : "Browse matches"}
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

function greet(locale: Locale, name: string): string {
  const hour = new Date().getHours();
  const period =
    locale === "fr"
      ? hour < 6 || hour >= 22
        ? "Bonne nuit"
        : hour < 12
          ? "Salut"
          : hour < 18
            ? "Bon après-midi"
            : "Bonsoir"
      : hour < 6 || hour >= 22
        ? "Good night"
        : hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening";
  return name ? `${period}, ${name}.` : `${period}.`;
}

function stageName(stage: string, locale: Locale): string {
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16ᵉ de finale", en: "Round of 32" },
    r16: { fr: "8ᵉ de finale", en: "Round of 16" },
    qf: { fr: "1/4 de finale", en: "Quarter-final" },
    sf: { fr: "1/2 finale", en: "Semi-final" },
    third_place: { fr: "Match 3ᵉ place", en: "3rd place playoff" },
    final: { fr: "Finale", en: "Final" },
    group: { fr: "Phase de groupes", en: "Group stage" },
  };
  return labels[stage]?.[locale] ?? stage;
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
