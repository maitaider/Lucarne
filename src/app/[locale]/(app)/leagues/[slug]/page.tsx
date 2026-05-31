import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  getLeagueBySlug,
  getLeagueStandings,
} from "@/lib/leagues/queries";
import { LeaderboardPodium } from "@/components/leaderboard/podium";
import { StandingsTable } from "@/components/leaderboard/standings-table";
import { LiveRefresh } from "@/components/live/live-refresh";
import { LeagueActivityFeed } from "@/components/social/league-activity-feed";
import { LeagueFeedBoard } from "@/components/social/league-feed-board";
import { listLeagueFeed } from "@/lib/social/feed";
import { listLeaguePosts } from "@/lib/social/league-feed";
import { getCurrentUser } from "@/lib/profile/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  Crown,
  Globe,
  Lock,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const [standings, activities, posts, currentUser] = await Promise.all([
    getLeagueStandings(league.id),
    listLeagueFeed(league.id),
    listLeaguePosts(league.id, 50),
    getCurrentUser(),
  ]);

  // Identify current user for highlight
  let currentUserId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }
  const isOwner = currentUserId === league.owner_id;
  const totalBets = standings.reduce((sum, entry) => sum + entry.bets_count, 0);
  const totalWins = standings.reduce((sum, entry) => sum + entry.wins, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <LiveRefresh />
      <header className="mb-4 rounded-sm border border-white/[0.1] bg-surface-1/[0.68] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
          {league.visibility === "private" ? <Lock className="size-3" /> : <Globe className="size-3" />}
          {league.visibility === "private"
            ? locale === "fr" ? "Ligue privée" : "Private league"
            : locale === "fr" ? "Ligue publique" : "Public league"}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
              {league.name}
            </h1>
            {league.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{league.description}</p>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Link
                href={`/leagues/${slug}/invite`}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500/15 px-3 py-1.5 text-xs font-semibold text-primary-400 ring-1 ring-primary-500/20 transition hover:bg-primary-500/25"
              >
                <UserPlus className="size-3.5" />
                {locale === "fr" ? "Inviter" : "Invite"}
              </Link>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
          <Users className="size-3" />
          {league.members.length}
          {league.member_limit ? ` / ${league.member_limit}` : ""}
        </div>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LeagueDetailMetric
          icon={Users}
          label={locale === "fr" ? "Membres" : "Members"}
          value={
            league.member_limit
              ? `${league.members.length}/${league.member_limit}`
              : `${league.members.length}`
          }
          detail={locale === "fr" ? "dans le salon" : "in room"}
          accent="primary"
        />
        <LeagueDetailMetric
          icon={Trophy}
          label={locale === "fr" ? "Classés" : "Ranked"}
          value={standings.length}
          detail={locale === "fr" ? "joueurs" : "players"}
          accent="gold"
        />
        <LeagueDetailMetric
          icon={ShieldCheck}
          label={locale === "fr" ? "Paris" : "Bets"}
          value={totalBets}
          detail={locale === "fr" ? "résolus" : "settled"}
          accent="violet"
        />
        <LeagueDetailMetric
          icon={Crown}
          label={locale === "fr" ? "Victoires" : "Wins"}
          value={totalWins}
          detail={locale === "fr" ? "bons tickets" : "correct tickets"}
          accent="primary"
        />
      </section>

      {standings.length === 0 ? (
        <LeagueStandingsEmpty locale={L} isOwner={isOwner} slug={slug} />
      ) : (
        <>
          {standings.length >= 1 && (
            <section className="mb-8">
              <LeaderboardPodium top3={standings.slice(0, 3)} />
            </section>
          )}
          <section className="mb-8">
            <StandingsTable
              entries={standings}
              highlightUserId={currentUserId}
              locale={locale === "fr" ? "fr" : "en"}
            />
          </section>
        </>
      )}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LeagueFeedBoard
          leagueId={league.id}
          initialPosts={posts}
          currentUserId={currentUserId}
          isAdmin={
            currentUser?.role === "admin" ||
            currentUser?.role === "super_admin"
          }
          locale={L}
        />
        <LeagueActivityFeed activities={activities} locale={L} />
      </section>
    </main>
  );
}

function LeagueDetailMetric({
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
    <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.64] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
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
      <div className="mt-1 text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function LeagueStandingsEmpty({
  locale,
  isOwner,
  slug,
}: {
  locale: Locale;
  isOwner: boolean;
  slug: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-sm bg-gold-500/15 p-2.5 text-gold-400 ring-1 ring-gold-500/30">
            <Trophy className="size-5" strokeWidth={1.6} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {locale === "fr" ? "Le board de ligue est prêt" : "The league board is ready"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
              {locale === "fr"
                ? "Les premiers paris validés alimenteront le podium, la table de classement et les statistiques de forme."
                : "First validated bets will populate the podium, standings table, and form stats."}
            </p>
          </div>
        </div>
        {isOwner && (
          <Link
            href={`/leagues/${slug}/invite`}
            className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            <UserPlus className="size-4" strokeWidth={2} />
            {locale === "fr" ? "Inviter" : "Invite"}
          </Link>
        )}
      </div>
    </div>
  );
}
