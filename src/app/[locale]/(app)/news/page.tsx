import { setRequestLocale } from "next-intl/server";
import { listNewsPosts, type NewsPost } from "@/lib/news/queries";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { EmptyStateVisual } from "@/components/layout/empty-state-visual";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import { Link } from "@/i18n/navigation";
import {
  Megaphone,
  Newspaper,
  Sparkles,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type NewsKind = NewsPost["kind"];

const KIND_CONFIG: Record<
  NewsKind | "all",
  { Icon: LucideIcon; fr: string; en: string; accent: string }
> = {
  all: {
    Icon: Newspaper,
    fr: "Tout",
    en: "All",
    accent: "bg-white/[0.06] text-text-secondary ring-white/[0.1]",
  },
  news: {
    Icon: Newspaper,
    fr: "Actu",
    en: "News",
    accent: "bg-primary-500/15 text-primary-300 ring-primary-500/30",
  },
  announcement: {
    Icon: Megaphone,
    fr: "Annonce",
    en: "Announcement",
    accent: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
  },
  release: {
    Icon: Sparkles,
    fr: "Mise à jour",
    en: "Release",
    accent: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  },
  match_recap: {
    Icon: Trophy,
    fr: "Résumé",
    en: "Match recap",
    accent: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
  },
  system: {
    Icon: Wrench,
    fr: "Système",
    en: "System",
    accent: "bg-white/[0.05] text-text-secondary ring-white/[0.1]",
  },
};

const FILTER_ORDER: Array<NewsKind | "all"> = [
  "all",
  "news",
  "announcement",
  "match_recap",
  "release",
];

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  const { kind } = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;
  const allPosts = await listNewsPosts(50);

  const activeKind: NewsKind | "all" = FILTER_ORDER.includes(
    kind as NewsKind | "all",
  )
    ? (kind as NewsKind | "all")
    : "all";

  const posts =
    activeKind === "all"
      ? allPosts
      : allPosts.filter((p) => p.kind === activeKind);

  const lastUpdated = allPosts[0]?.published_at ?? null;
  const counts = FILTER_ORDER.reduce<Record<string, number>>((acc, k) => {
    acc[k] = k === "all" ? allPosts.length : allPosts.filter((p) => p.kind === k).length;
    return acc;
  }, {});

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={L === "fr" ? "Fil d'actu" : "News feed"}
        kickerIcon={Newspaper}
        accent="primary"
        title={L === "fr" ? "Le mur des news" : "The news wall"}
        description={
          L === "fr"
            ? "Annonces, résumés de matchs et mises à jour. Alimenté par Hermes pendant le tournoi, ou directement par l'admin."
            : "Announcements, match recaps, and updates. Fed by Hermes during the tournament, or directly by the admin."
        }
        stats={
          <DataSourceBadge
            source="hermes"
            updatedAt={lastUpdated}
            locale={L}
          />
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/05-news-hermes-feed.svg",
          alt:
            L === "fr"
              ? "Fil d'actualités Hermes Lucarne"
              : "Lucarne Hermes news feed",
        }}
      />

      {/* Filter chips */}
      <nav
        className="flex flex-wrap items-center gap-1.5"
        aria-label={L === "fr" ? "Filtrer par type" : "Filter by kind"}
      >
        {FILTER_ORDER.map((k) => {
          const cfg = KIND_CONFIG[k];
          const Icon = cfg.Icon;
          const isActive = activeKind === k;
          const count = counts[k] ?? 0;
          return (
            <Link
              key={k}
              href={k === "all" ? "/news" : `/news?kind=${k}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition",
                isActive
                  ? "border-primary-500/40 bg-primary-500/[0.12] text-primary-200 shadow-glow-primary"
                  : "border-white/[0.08] bg-white/[0.04] text-text-tertiary hover:border-white/[0.2] hover:text-text-primary",
              )}
            >
              <Icon className="size-3" strokeWidth={2} />
              {L === "fr" ? cfg.fr : cfg.en}
              <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-text-tertiary">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {posts.length === 0 ? (
        <EmptyStateVisual
          src="/assets/lucarne/claude-pack-20260525/svg/05-news-hermes-feed.svg"
          alt={
            L === "fr" ? "Pas encore de news" : "No news yet"
          }
          title={
            activeKind === "all"
              ? L === "fr"
                ? "Pas encore de news"
                : "No news yet"
              : L === "fr"
                ? "Aucune news dans cette catégorie"
                : "No news in this category"
          }
          body={
            L === "fr"
              ? "Hermes ou l'admin publieront ici dès que le tournoi reprendra."
              : "Hermes or the admin will post here as soon as the tournament resumes."
          }
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => {
            const cfg = KIND_CONFIG[p.kind] ?? KIND_CONFIG.news;
            const Icon = cfg.Icon;
            return (
              <li
                key={p.id}
                className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl transition hover:border-white/[0.16] hover:bg-surface-1/[0.7]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                      cfg.accent,
                    )}
                  >
                    <Icon className="size-3" strokeWidth={2} />
                    {L === "fr" ? cfg.fr : cfg.en}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                    {p.source === "hermes" && (
                      <span className="rounded-full bg-violet-500/[0.15] px-2 py-0.5 font-bold uppercase tracking-wider text-violet-300 ring-1 ring-violet-500/30">
                        Hermes
                      </span>
                    )}
                    <time dateTime={p.published_at}>
                      {new Date(p.published_at).toLocaleDateString(
                        L === "fr" ? "fr-CA" : "en-CA",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </time>
                  </div>
                </div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">
                  {p.title}
                </h2>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {p.body}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppPageShell>
  );
}
