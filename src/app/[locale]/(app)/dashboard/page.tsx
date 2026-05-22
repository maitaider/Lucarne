import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { getMyStats } from "@/lib/profile/stats";
import { listMatches } from "@/lib/matches/queries";
import { listMyBets } from "@/lib/bets/queries";
import { listMyLeagues } from "@/lib/leagues/queries";
import { MatchCard } from "@/components/match/match-card";
import { BetStatusBadge } from "@/components/bet/bet-status-badge";
import {
  Coins,
  Trophy,
  TrendingUp,
  Receipt,
  Users,
  CalendarClock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [user, stats, allMatches, myBets, myLeagues] = await Promise.all([
    getCurrentUser(),
    getMyStats(),
    listMatches(),
    listMyBets(),
    listMyLeagues(),
  ]);

  const nextMatches = allMatches
    .filter((m) => m.status === "scheduled" && new Date(m.kickoff_at) > new Date())
    .slice(0, 3);
  const liveMatches = allMatches.filter((m) => m.status === "live");
  const recentBets = myBets.slice(0, 5);
  const activeBets = myBets.filter(
    (b) =>
      b.status === "pending_payment" ||
      b.status === "paid" ||
      b.status === "validated",
  );

  const firstName = user?.display_name?.split(" ")[0] ?? user?.username ?? "";
  const balanceTokens = Math.floor((user?.balance_cents ?? 0) / 100);
  const winRatePct = Math.round(stats.win_rate * 100);
  const netTokens = Math.floor(stats.net_cents / 100);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Greeting */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {greet(L, firstName)}
        </h1>
        <p className="mt-2 text-text-secondary">
          {L === "fr"
            ? "Voici ton tableau de bord du Mondial 2026."
            : "Here's your 2026 World Cup dashboard."}
        </p>
      </header>

      {/* Stats grid */}
      <section className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              ? `${L === "fr" ? "sur" : "of"} ${stats.total_bets}`
              : L === "fr"
                ? "aucun pari"
                : "no bets yet"
          }
          accent="violet"
          href="/bets"
        />
        <StatCard
          icon={Trophy}
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
          icon={TrendingUp}
          label={L === "fr" ? "Bilan" : "Net gain"}
          value={`${netTokens > 0 ? "+" : ""}${netTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")}`}
          unit={L === "fr" ? "jetons" : "tokens"}
          accent={netTokens >= 0 ? "primary" : "error"}
        />
      </section>

      {/* Onboarding for empty state */}
      {stats.total_bets === 0 && (
        <section className="mb-10 overflow-hidden rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/[0.08] via-violet-500/[0.04] to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary-500/15 p-2.5 ring-1 ring-primary-500/30">
              <Sparkles className="size-5 text-primary-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-text-primary">
                {L === "fr" ? "Premier pari à placer !" : "Place your first bet!"}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {L === "fr"
                  ? "Tu as 1 000 jetons de bienvenue. Parcours le calendrier et lance-toi sur un match."
                  : "You have 1,000 welcome tokens. Browse the calendar and pick a match."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/matches"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-base shadow-glow-primary transition hover:bg-primary-400"
                >
                  {L === "fr" ? "Voir les matchs" : "Browse matches"}
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
                <Link
                  href="/leagues/new"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-1/60 px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-2/60"
                >
                  {L === "fr" ? "Créer une ligue" : "Create a league"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Two-column section */}
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="space-y-8">
          {/* Live + next matches */}
          <section>
            <SectionHeader
              icon={CalendarClock}
              title={
                liveMatches.length > 0
                  ? L === "fr"
                    ? "En direct + prochains matchs"
                    : "Live + upcoming"
                  : L === "fr"
                    ? "Prochains matchs"
                    : "Upcoming matches"
              }
              href="/matches"
              linkLabel={L === "fr" ? "Tous les matchs" : "All matches"}
            />
            {nextMatches.length + liveMatches.length === 0 ? (
              <EmptyBlock
                text={
                  L === "fr"
                    ? "Aucun match à venir."
                    : "No upcoming matches."
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...liveMatches, ...nextMatches].slice(0, 4).map((m) => (
                  <MatchCard key={m.id} match={m} locale={L} />
                ))}
              </div>
            )}
          </section>

          {/* Recent bets */}
          {recentBets.length > 0 && (
            <section>
              <SectionHeader
                icon={Receipt}
                title={L === "fr" ? "Tes derniers paris" : "Your recent bets"}
                href="/bets"
                linkLabel={L === "fr" ? "Tous mes paris" : "All my bets"}
              />
              <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-1/40">
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
                        {new Date(b.submitted_at).toLocaleDateString(
                          L === "fr" ? "fr-FR" : "en-US",
                          { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        · {Math.floor(b.stake_cents / 100)}{" "}
                        {L === "fr" ? "jetons" : "tokens"}
                      </div>
                    </div>
                    <BetStatusBadge status={b.status} result={b.result} locale={L} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right column — leagues */}
        <aside className="space-y-8">
          <section>
            <SectionHeader
              icon={Users}
              title={L === "fr" ? "Mes ligues" : "My leagues"}
              href="/leagues"
              linkLabel={L === "fr" ? "Voir tout" : "View all"}
            />
            {myLeagues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle bg-surface-1/40 p-6 text-center">
                <p className="text-sm text-text-secondary">
                  {L === "fr"
                    ? "Tu n'es dans aucune ligue."
                    : "You're not in any league yet."}
                </p>
                <Link
                  href="/leagues/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-4 py-1.5 text-xs font-semibold text-primary-400 ring-1 ring-primary-500/30 transition hover:bg-primary-500/25"
                >
                  {L === "fr" ? "Créer une ligue" : "Create a league"}
                  <ArrowRight className="size-3.5" strokeWidth={2} />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {myLeagues.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/leagues/${l.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-1/40 px-4 py-3 transition hover:border-border-strong hover:bg-surface-2/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-text-primary">
                          {l.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {l.member_count}{" "}
                          {l.member_count > 1
                            ? L === "fr"
                              ? "membres"
                              : "members"
                            : L === "fr"
                              ? "membre"
                              : "member"}
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

function greet(locale: Locale, name: string): string {
  const hour = new Date().getHours();
  const period = locale === "fr"
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

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  href,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  unit: string;
  accent: "primary" | "gold" | "violet" | "error";
  href?: string;
}) {
  const colors = {
    primary: { bg: "bg-primary-500/10", ring: "ring-primary-500/20", text: "text-primary-400" },
    gold: { bg: "bg-gold-500/10", ring: "ring-gold-500/20", text: "text-gold-400" },
    violet: { bg: "bg-violet-500/10", ring: "ring-violet-500/20", text: "text-violet-400" },
    error: { bg: "bg-error/10", ring: "ring-error/20", text: "text-error" },
  }[accent];

  const content = (
    <div className="group relative overflow-hidden rounded-xl border border-border-subtle bg-surface-1/40 p-4 transition hover:border-border-strong hover:bg-surface-1/60">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ring-1 ${colors.bg} ${colors.ring}`}>
          <Icon className={`size-4 ${colors.text}`} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
            {label}
          </div>
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-text-tertiary">{unit}</div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SectionHeader({
  icon: Icon,
  title,
  href,
  linkLabel,
}: {
  icon: typeof Receipt;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-text-primary">
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

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-surface-1/40 p-6 text-center text-sm text-text-secondary">
      {text}
    </div>
  );
}

function betLabel(
  bet: {
    bet_type: string;
    match: {
      home_team: { name_fr: string; name_en: string; flag_emoji: string | null } | null;
      away_team: { name_fr: string; name_en: string; flag_emoji: string | null } | null;
    } | null;
  },
  locale: Locale,
): string {
  if (!bet.match) return bet.bet_type;
  const home = bet.match.home_team
    ? `${bet.match.home_team.flag_emoji ?? ""} ${locale === "fr" ? bet.match.home_team.name_fr : bet.match.home_team.name_en}`
    : "?";
  const away = bet.match.away_team
    ? `${bet.match.away_team.flag_emoji ?? ""} ${locale === "fr" ? bet.match.away_team.name_fr : bet.match.away_team.name_en}`
    : "?";
  return `${home.trim()} – ${away.trim()}`;
}
