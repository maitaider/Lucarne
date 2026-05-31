import { setRequestLocale } from "next-intl/server";
import { getGlobalStandings, getStageStandings } from "@/lib/leagues/queries";
import { getProjectedPayouts } from "@/lib/leagues/projected-payouts";
import { formatMoney } from "@/lib/admin/economy";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { LeaderboardPodium } from "@/components/leaderboard/podium";
import { StandingsTable } from "@/components/leaderboard/standings-table";
import { LiveRefresh } from "@/components/live/live-refresh";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Coins,
  Crown,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

const STAGE_KEYS = ["group", "r32", "r16", "qf", "sf", "third_place", "final"];

const STAGE_TABS: { key: string | null; fr: string; en: string }[] = [
  { key: null, fr: "Tout", en: "All" },
  { key: "group", fr: "Groupes", en: "Groups" },
  { key: "r32", fr: "16es", en: "R32" },
  { key: "r16", fr: "8es", en: "R16" },
  { key: "qf", fr: "Quarts", en: "QF" },
  { key: "sf", fr: "Demies", en: "SF" },
  { key: "final", fr: "Finale", en: "Final" },
];

const MATCHDAY_TABS: { key: number | null; fr: string; en: string }[] = [
  { key: null, fr: "Toutes", en: "All" },
  { key: 1, fr: "J1", en: "MD1" },
  { key: 2, fr: "J2", en: "MD2" },
  { key: 3, fr: "J3", en: "MD3" },
];

function LeaderboardFilters({
  phase,
  matchday,
  locale,
}: {
  phase: string | null;
  matchday: number | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <div className="-mt-1 space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          Phase
        </span>
        {STAGE_TABS.map((t) => {
          const active = phase === t.key;
          const href = t.key
            ? `/leaderboard/global?phase=${t.key}`
            : "/leaderboard/global";
          return (
            <Link
              key={t.key ?? "all"}
              href={href}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
                active
                  ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                  : "border-white/[0.1] bg-white/[0.03] text-text-secondary hover:border-white/20 hover:text-text-primary",
              )}
            >
              {fr ? t.fr : t.en}
            </Link>
          );
        })}
      </div>
      {phase === "group" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {fr ? "Journée" : "Matchday"}
          </span>
          {MATCHDAY_TABS.map((t) => {
            const active = matchday === t.key;
            const href = t.key
              ? `/leaderboard/global?phase=group&jour=${t.key}`
              : "/leaderboard/global?phase=group";
            return (
              <Link
                key={t.key ?? "all"}
                href={href}
                scroll={false}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-primary-500/40 bg-primary-500/15 text-primary-200"
                    : "border-white/[0.1] bg-white/[0.03] text-text-secondary hover:border-white/20 hover:text-text-primary",
                )}
              >
                {fr ? t.fr : t.en}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function GlobalLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ phase?: string; jour?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const phase =
    typeof sp.phase === "string" && STAGE_KEYS.includes(sp.phase)
      ? sp.phase
      : null;
  const matchday =
    phase === "group" && ["1", "2", "3"].includes(sp.jour ?? "")
      ? Number(sp.jour)
      : null;
  const isFiltered = phase !== null;

  const [standings, projected] = await Promise.all([
    isFiltered ? getStageStandings(phase, matchday) : getGlobalStandings(),
    isFiltered ? Promise.resolve(null) : getProjectedPayouts(),
  ]);
  const leader = standings[0];
  const totalBets = standings.reduce((sum, entry) => sum + entry.bets_count, 0);
  const totalWins = standings.reduce((sum, entry) => sum + entry.wins, 0);
  const moneyLocale = L === "fr" ? "fr-CA" : "en-CA";
  const podiumPayouts = projected
    ? {
        payouts: projected.payouts,
        currency: projected.settings.currency,
        locale: moneyLocale,
      }
    : undefined;

  let currentUserId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }

  return (
    <AppPageShell width="ultra">
      <LiveRefresh />
      <PageHero
        kicker={L === "fr" ? "Course au trophée" : "Trophy race"}
        kickerIcon={Trophy}
        accent="gold"
        title={
          L === "fr" ? "Classement global" : "Global leaderboard"
        }
        description={
          L === "fr"
            ? "Tous les joueurs Lucarne, leurs points et leur progression vers le podium Coupe du Monde. En fin de tournoi, le pot du groupe récompense les meilleurs, à l'amiable."
            : "All Lucarne players, their points, and their progression toward the World Cup podium. At the end, the group pot rewards the best, informally."
        }
        stats={
          <>
            <LeaderboardStat
              label={L === "fr" ? "Joueurs" : "Players"}
              value={`${standings.length}`}
              tone="primary"
            />
            <LeaderboardStat
              label={L === "fr" ? "Paris réglés" : "Settled bets"}
              value={`${totalBets}`}
              tone="violet"
            />
            <LeaderboardStat
              label={L === "fr" ? "Leader" : "Leader"}
              value={leader ? `@${leader.username}` : "—"}
              tone="gold"
            />
          </>
        }
      />

      <LeaderboardFilters phase={phase} matchday={matchday} locale={L} />

      {standings.length === 0 ? (
        <EmptyLeaderboardPreview locale={L} />
      ) : (
        <>
          {!isFiltered && projected && (
            <ProjectedPotCard
              locale={L}
              poolCents={projected.pool_cents}
              currency={projected.settings.currency}
              moneyLocale={moneyLocale}
              shares={projected.shares}
              payouts={projected.payouts}
              top3={standings.slice(0, 3)}
            />
          )}
          {isFiltered && totalBets === 0 && (
            <p className="mb-6 rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.5] px-4 py-3 text-center text-sm text-text-tertiary">
              {L === "fr"
                ? "Aucun point marqué dans cette phase pour l'instant."
                : "No points scored in this phase yet."}
            </p>
          )}
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LeaderboardMetric
              icon={ShieldCheck}
              label={locale === "fr" ? "Victoires" : "Wins"}
              value={totalWins}
              detail={locale === "fr" ? "bons pronostics" : "correct calls"}
              accent="primary"
            />
            <LeaderboardMetric
              icon={Trophy}
              label={locale === "fr" ? "Podium" : "Podium"}
              value={Math.min(standings.length, 3)}
              detail={locale === "fr" ? "places premium" : "premium spots"}
              accent="gold"
            />
            <LeaderboardMetric
              icon={Users}
              label={locale === "fr" ? "Peloton" : "Pack"}
              value={Math.max(standings.length - 3, 0)}
              detail={locale === "fr" ? "en chasse" : "chasing"}
              accent="violet"
            />
            <LeaderboardMetric
              icon={Crown}
              label={locale === "fr" ? "Score top" : "Top score"}
              value={leader?.total_points ?? 0}
              detail={locale === "fr" ? "points" : "points"}
              accent="gold"
            />
          </div>
          {standings.length >= 1 && (
            <section className="mb-8">
              <LeaderboardPodium
                top3={standings.slice(0, 3)}
                payouts={podiumPayouts}
              />
            </section>
          )}
          <StandingsTable
            entries={standings}
            highlightUserId={currentUserId}
            locale={locale === "fr" ? "fr" : "en"}
          />
        </>
      )}
    </AppPageShell>
  );
}

function LeaderboardStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "gold" | "violet";
}) {
  const cls = {
    primary: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
    gold: "border-gold-500/35 bg-gold-500/[0.08] text-gold-300",
    violet: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
      <span className="font-mono normal-case text-text-primary">{value}</span>
    </span>
  );
}

function LeaderboardMetric({
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
    <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-[8px] border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-1 truncate text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function ProjectedPotCard({
  locale,
  poolCents,
  currency,
  moneyLocale,
  shares,
  payouts,
  top3,
}: {
  locale: Locale;
  poolCents: number;
  currency: string;
  moneyLocale: string;
  shares: number[];
  payouts: number[];
  top3: Awaited<ReturnType<typeof getGlobalStandings>>;
}) {
  const seats = [0, 1, 2].map((idx) => ({
    rank: idx + 1,
    payout: payouts[idx] ?? 0,
    share: shares[idx] ?? 0,
    entry: top3[idx] ?? null,
  }));

  return (
    <section className="mb-8 overflow-hidden rounded-[12px] border border-gold-500/25 bg-gradient-to-br from-gold-500/[0.12] via-gold-500/[0.04] to-transparent p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/[0.14] text-gold-300 shadow-glow-gold">
            <Coins className="size-5" strokeWidth={1.6} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {locale === "fr" ? "Cagnotte projetée" : "Projected pot"}
            </p>
            <h2 className="font-display text-2xl font-bold tabular-nums text-text-primary sm:text-3xl">
              {formatMoney(poolCents, currency, moneyLocale)}
            </h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-text-secondary">
              {locale === "fr"
                ? "Total collecté à ce jour. Le tournoi finit le 19 juillet 2026 — les paiements continuent jusqu’à la date butoire."
                : "Total real money collected so far. The tournament ends July 19, 2026 — payments keep flowing until the deadline."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {seats.map((seat) => {
            const Icon =
              seat.rank === 1 ? Crown : seat.rank === 2 ? Trophy : Medal;
            const tone =
              seat.rank === 1
                ? "border-gold-500/40 bg-gold-500/[0.14] text-gold-300"
                : seat.rank === 2
                  ? "border-text-secondary/30 bg-text-secondary/[0.1] text-text-primary"
                  : "border-amber-700/35 bg-amber-700/[0.12] text-amber-300";
            return (
              <div
                key={seat.rank}
                className={`min-w-[110px] rounded-[10px] border p-3 ring-1 ring-inset ring-white/[0.04] ${tone}`}
              >
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span>#{seat.rank}</span>
                  <Icon className="size-3.5" strokeWidth={1.7} />
                </div>
                <div className="font-display text-lg font-bold tabular-nums">
                  {formatMoney(seat.payout, currency, moneyLocale)}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-text-tertiary">
                  {seat.share}%{" "}
                  {seat.entry
                    ? `· @${seat.entry.username}`
                    : locale === "fr"
                      ? "· libre"
                      : "· open"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-wider text-text-tertiary">
        {locale === "fr"
          ? "Estimation indicative — la cagnotte évolue au fil des paiements confirmés."
          : "Snapshot — the pot evolves as new payments clear."}
      </p>
    </section>
  );
}

function EmptyLeaderboardPreview({ locale }: { locale: Locale }) {
  const rows = [
    {
      rank: 1,
      label: locale === "fr" ? "Premier leader" : "First leader",
      tone: "gold",
    },
    {
      rank: 2,
      label: locale === "fr" ? "Chasseur direct" : "Direct challenger",
      tone: "primary",
    },
    {
      rank: 3,
      label: locale === "fr" ? "Podium ouvert" : "Open podium",
      tone: "primary",
    },
    {
      rank: 4,
      label: locale === "fr" ? "Peloton" : "Pack",
      tone: "neutral",
    },
  ];

  return (
    <div className="rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-[8px] bg-gold-500/15 p-2.5 text-gold-400 ring-1 ring-gold-500/30">
          <Trophy className="size-5" strokeWidth={1.6} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? "Le classement attend les premiers résultats" : "The leaderboard is waiting for first results"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? "Dès que les paris sont résolus, ce board affiche le podium, les points, les victoires et la forme des joueurs."
              : "As soon as bets are settled, this board shows the podium, points, wins, and player form."}
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-[8px] border border-white/[0.08]">
        {rows.map((row) => (
          <div
            key={row.rank}
            className="grid grid-cols-[3rem_1fr_4rem] items-center gap-3 border-b border-white/[0.055] bg-white/[0.035] px-3 py-3 last:border-b-0"
          >
            <span
              className={
                row.tone === "gold"
                  ? "flex size-8 items-center justify-center rounded-[8px] bg-gold-500/15 font-display text-sm font-bold text-gold-400 ring-1 ring-gold-500/30"
                  : row.tone === "primary"
                    ? "flex size-8 items-center justify-center rounded-[8px] bg-primary-500/15 font-display text-sm font-bold text-primary-400 ring-1 ring-primary-500/25"
                    : "flex size-8 items-center justify-center rounded-[8px] bg-white/[0.05] font-display text-sm font-bold text-text-tertiary"
              }
            >
              {row.rank}
            </span>
            <span className="text-sm font-semibold text-text-primary">{row.label}</span>
            <span className="text-right font-display text-sm font-semibold tabular-nums text-text-tertiary">
              0 pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
