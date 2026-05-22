import { setRequestLocale } from "next-intl/server";
import { getGlobalStandings } from "@/lib/leagues/queries";
import { LeaderboardPodium } from "@/components/leaderboard/podium";
import { StandingsTable } from "@/components/leaderboard/standings-table";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  Crown,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function GlobalLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const standings = await getGlobalStandings();
  const leader = standings[0];
  const totalBets = standings.reduce((sum, entry) => sum + entry.bets_count, 0);
  const totalWins = standings.reduce((sum, entry) => sum + entry.wins, 0);

  let currentUserId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <header className="mb-4 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.68] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
              <Trophy className="size-3.5" strokeWidth={1.7} />
              {locale === "fr" ? "Course au trophée" : "Trophy race"}
            </div>
            <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
              {locale === "fr" ? "Classement global" : "Global leaderboard"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {locale === "fr"
                ? "Tous les joueurs Lucarne, leurs points, leur forme et leur progression vers le podium Coupe du Monde."
                : "All Lucarne players, their points, form, and progression toward the World Cup podium."}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <LeaderboardMetric
              icon={Users}
              label={locale === "fr" ? "Joueurs" : "Players"}
              value={standings.length}
              detail={locale === "fr" ? "classés" : "ranked"}
              accent="primary"
            />
            <LeaderboardMetric
              icon={Medal}
              label={locale === "fr" ? "Paris" : "Bets"}
              value={totalBets}
              detail={locale === "fr" ? "résolus" : "settled"}
              accent="violet"
            />
            <LeaderboardMetric
              icon={Crown}
              label={locale === "fr" ? "Leader" : "Leader"}
              value={leader ? `#${leader.rank}` : "—"}
              detail={leader?.display_name ?? leader?.username ?? (locale === "fr" ? "à venir" : "pending")}
              accent="gold"
            />
          </div>
        </div>
      </header>

      {standings.length === 0 ? (
        <EmptyLeaderboardPreview locale={L} />
      ) : (
        <>
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
              <LeaderboardPodium top3={standings.slice(0, 3)} />
            </section>
          )}
          <StandingsTable
            entries={standings}
            highlightUserId={currentUserId}
            locale={locale === "fr" ? "fr" : "en"}
          />
        </>
      )}
    </main>
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
