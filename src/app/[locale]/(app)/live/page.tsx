import { setRequestLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { listNewsPosts } from "@/lib/news/queries";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { LiveScores } from "@/components/live/live-scores";
import { LiveNews } from "@/components/live/live-news";
import { LiveRefresh } from "@/components/live/live-refresh";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import { Newspaper, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Tab = "scores" | "news";

/**
 * `/live` — real-time tournament hub.
 *
 *  - Desktop: scores fill the main column, news rail sits on the right.
 *    Tabs are hidden (everything is on screen).
 *  - Mobile: tabs switch between the two surfaces (single-column).
 *  - Freshness chips on each surface show how stale the data is and
 *    where it came from (Hermes / API-Football / admin).
 */
export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const activeTab: Tab = tab === "news" ? "news" : "scores";

  // We need both on desktop (rail layout). On mobile we only render
  // the active tab, but fetching both is cheap — the news query is
  // tiny and matches is already cached.
  const [allMatches, news] = await Promise.all([
    listMatches(),
    listNewsPosts(20),
  ]);

  const now = Date.now();
  const liveCount = allMatches.filter((m) => m.status === "live").length;
  const todayMatches = allMatches
    .filter((m) => sameDay(new Date(m.kickoff_at), new Date()))
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
  const recentlyFinished = allMatches
    .filter(
      (m) =>
        m.status === "finished" &&
        new Date(m.kickoff_at).getTime() > now - 48 * 3_600_000,
    )
    .sort(
      (a, b) =>
        new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime(),
    )
    .slice(0, 6);

  // Freshness: most recently kicked-off / finished match drives the
  // "Mis à jour il y a Xmin" chip on scores; most recently published
  // post drives the chip on news.
  const lastMatchActivity =
    allMatches
      .map((m) => new Date(m.kickoff_at).getTime())
      .filter((t) => t < now)
      .sort((a, b) => b - a)[0] ?? null;
  const lastNewsActivity =
    news[0]?.published_at ? new Date(news[0].published_at).getTime() : null;

  return (
    <AppPageShell width="ultra">
      <LiveRefresh intervalMs={30000} />
      <PageHero
        kicker={L === "fr" ? "Live" : "Live"}
        kickerIcon={Radio}
        accent="violet"
        title={L === "fr" ? "Le tournoi en direct" : "Tournament live"}
        description={
          L === "fr"
            ? "Scores en direct, résultats du jour et fil d'actualités, alimentés automatiquement par Hermes pendant les matchs."
            : "Live scores, today's results, and the news feed — auto-fed by Hermes while matches are running."
        }
        stats={
          <>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/45 bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-300 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-violet-300" />
                </span>
                {liveCount} {L === "fr" ? "en direct" : "live"}
              </span>
            )}
            <DataSourceBadge
              source="hermes"
              updatedAt={
                lastMatchActivity ? new Date(lastMatchActivity).toISOString() : null
              }
              locale={L}
            />
          </>
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/04-live-match-center.svg",
          alt:
            L === "fr"
              ? "Centre live Lucarne — scores et news en direct"
              : "Lucarne live center — scores and news",
          priority: true,
        }}
      />

      {/* Mobile tab switcher — hidden on desktop */}
      <nav
        className="inline-flex self-start rounded-[8px] border border-white/[0.1] bg-abyss/[0.44] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl lg:hidden"
        aria-label="Live sections"
      >
        <MobileTabLink
          href="/live"
          icon={Radio}
          label={L === "fr" ? "Scores" : "Scores"}
          active={activeTab === "scores"}
          badge={liveCount > 0 ? liveCount : undefined}
        />
        <MobileTabLink
          href="/live?tab=news"
          icon={Newspaper}
          label={L === "fr" ? "Actus" : "News"}
          active={activeTab === "news"}
        />
      </nav>

      {/* Desktop: 2-column scores + news rail. Mobile: single column based on tab. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
        <section className={cn(activeTab === "news" && "hidden lg:block")}>
          <LiveScores
            todayMatches={todayMatches}
            recentlyFinished={recentlyFinished}
            locale={L}
          />
        </section>

        <aside className={cn(activeTab === "scores" && "hidden lg:block")}>
          <NewsRail
            posts={news}
            lastUpdated={
              lastNewsActivity ? new Date(lastNewsActivity).toISOString() : null
            }
            locale={L}
          />
        </aside>
      </div>
    </AppPageShell>
  );
}

function NewsRail({
  posts,
  lastUpdated,
  locale,
}: {
  posts: Awaited<ReturnType<typeof listNewsPosts>>;
  lastUpdated: string | null;
  locale: Locale;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <Newspaper className="size-3" strokeWidth={2} />
          {locale === "fr" ? "Actus" : "News"}
        </h2>
        <DataSourceBadge
          source="hermes"
          updatedAt={lastUpdated}
          locale={locale}
        />
      </div>
      <LiveNews posts={posts} locale={locale} />
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline"
      >
        {locale === "fr" ? "Toutes les actus" : "All news"} →
      </Link>
    </div>
  );
}

function MobileTabLink({
  href,
  icon: Icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: typeof Radio;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href as never}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-violet-500 text-abyss shadow-glow-violet"
          : "text-text-secondary hover:bg-white/[0.05] hover:text-text-primary",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
      {badge !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
            active ? "bg-abyss/25 text-abyss" : "bg-violet-500/15 text-violet-300",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
