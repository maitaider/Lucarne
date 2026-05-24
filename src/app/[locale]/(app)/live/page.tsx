import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listMatches } from "@/lib/matches/queries";
import { listNewsPosts } from "@/lib/news/queries";
import { LiveScores } from "@/components/live/live-scores";
import { LiveNews } from "@/components/live/live-news";
import { Newspaper, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Tab = "scores" | "news";

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

  // Fetch the slice we actually render — saves payload + DB time.
  const [allMatches, news] = await Promise.all([
    activeTab === "scores" ? listMatches() : Promise.resolve([]),
    activeTab === "news" ? listNewsPosts(40) : Promise.resolve([]),
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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="relative mb-6 overflow-hidden rounded-[12px] border border-white/[0.13] bg-abyss/[0.8] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.2]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-violet-500/35 bg-violet-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
            {liveCount > 0 && (
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
              </span>
            )}
            <Radio className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Live" : "Live"}
            {liveCount > 0 && (
              <span className="ml-1 text-violet-200">
                · {liveCount} {L === "fr" ? "en cours" : "live"}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr" ? "Le tournoi en direct" : "Tournament live"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "Scores live, résultats du jour et fil d'actualités. Mis à jour automatiquement par Hermes (cron toutes les 5 min pendant les matchs)."
              : "Live scores, today's results, and the news feed. Auto-refreshed by Hermes (cron every 5 min during matches)."}
          </p>
        </div>
      </header>

      {/* Sub-tabs */}
      <nav
        className="mb-6 inline-flex rounded-[8px] border border-white/[0.1] bg-abyss/[0.44] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
        aria-label="Live sections"
      >
        <TabLink
          href="/live"
          icon={Radio}
          label={L === "fr" ? "Scores" : "Scores"}
          active={activeTab === "scores"}
          badge={liveCount > 0 ? liveCount : undefined}
        />
        <TabLink
          href="/live?tab=news"
          icon={Newspaper}
          label={L === "fr" ? "Actus" : "News"}
          active={activeTab === "news"}
        />
      </nav>

      {activeTab === "scores" ? (
        <LiveScores
          todayMatches={todayMatches}
          recentlyFinished={recentlyFinished}
          locale={L}
        />
      ) : (
        <LiveNews posts={news} locale={L} />
      )}
    </main>
  );
}

function TabLink({
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
