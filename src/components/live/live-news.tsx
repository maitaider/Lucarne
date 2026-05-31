import type { NewsPost } from "@/lib/news/queries";
import {
  Bell,
  Megaphone,
  Newspaper,
  Rocket,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const KIND_META: Record<
  NewsPost["kind"],
  { fr: string; en: string; icon: LucideIcon; tone: string }
> = {
  news: {
    fr: "Actu",
    en: "News",
    icon: Newspaper,
    tone: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
  },
  announcement: {
    fr: "Annonce",
    en: "Announcement",
    icon: Megaphone,
    tone: "border-gold-500/30 bg-gold-500/[0.08] text-gold-300",
  },
  match_recap: {
    fr: "Résumé match",
    en: "Match recap",
    icon: Trophy,
    tone: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
  },
  release: {
    fr: "Nouveauté",
    en: "Release",
    icon: Rocket,
    tone: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
  },
  system: {
    fr: "Système",
    en: "System",
    icon: Wrench,
    tone: "border-white/[0.1] bg-white/[0.04] text-text-tertiary",
  },
};

export function LiveNews({
  posts,
  locale,
}: {
  posts: NewsPost[];
  locale: Locale;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/[0.1] bg-surface-1/[0.5] p-8 text-center backdrop-blur-xl">
        <Bell className="mx-auto mb-2 size-6 text-text-tertiary" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">
          {locale === "fr"
            ? "Pas encore d'actu. Hermes ou l'admin posteront ici."
            : "No news yet. Hermes or the admin will post here."}
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {posts.map((p) => {
        const meta = KIND_META[p.kind] ?? KIND_META.news;
        const Icon = meta.icon;
        const date = new Date(p.published_at).toLocaleString(
          locale === "fr" ? "fr-CA" : "en-CA",
          { dateStyle: "medium", timeStyle: "short" },
        );
        return (
          <li
            key={p.id}
            className="overflow-hidden rounded-md border border-white/[0.08] bg-surface-1/[0.6] p-4 backdrop-blur-xl sm:p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                  meta.tone,
                )}
              >
                <Icon className="size-3" strokeWidth={2} />
                {locale === "fr" ? meta.fr : meta.en}
              </span>
              <span className="text-text-tertiary">{date}</span>
              <span className="text-text-tertiary">
                · {p.source === "hermes" ? "Hermes" : p.source}
              </span>
            </div>
            <h3 className="mb-1 font-display text-base font-semibold text-text-primary sm:text-lg">
              {p.title}
            </h3>
            <p className="whitespace-pre-line text-sm leading-6 text-text-secondary">
              {p.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
