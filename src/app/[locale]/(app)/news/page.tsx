import { setRequestLocale } from "next-intl/server";
import { listNewsPosts } from "@/lib/news/queries";
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

const KIND_CONFIG: Record<
  string,
  { Icon: LucideIcon; fr: string; en: string; accent: string }
> = {
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

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const posts = await listNewsPosts(30);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-[12px] border border-white/[0.1] bg-gradient-to-br from-primary-500/[0.08] via-transparent to-violet-500/[0.06] p-6 backdrop-blur-xl">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/[0.1] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
          <Newspaper className="size-3" strokeWidth={2} />
          Lucarne ·{" "}
          {L === "fr" ? "Fil d'actualité" : "News feed"}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {L === "fr" ? "Le mur des news" : "The news wall"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {L === "fr"
            ? "Annonces de l'admin, résumés de matchs, mises à jour de l'app — tout y passe."
            : "Admin announcements, match recaps, app updates — everything lands here."}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-12 text-center backdrop-blur-xl">
          <Newspaper className="mx-auto mb-3 size-7 text-text-tertiary" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">
            {L === "fr"
              ? "Pas encore de news. Hermes ou l'admin publieront ici."
              : "No news yet. Hermes or the admin will post here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => {
            const cfg = KIND_CONFIG[p.kind] ?? KIND_CONFIG.news;
            const Icon = cfg.Icon;
            return (
              <li
                key={p.id}
                className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl transition hover:border-white/[0.16] hover:bg-surface-1/[0.7]"
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
    </main>
  );
}
