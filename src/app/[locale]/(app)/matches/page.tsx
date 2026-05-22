import { setRequestLocale, getTranslations } from "next-intl/server";
import { listMatches, groupMatchesByDate } from "@/lib/matches/queries";
import { MatchCard } from "@/components/match/match-card";
import type { Locale } from "@/i18n/routing";

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string; group?: string }>;
}) {
  const { locale } = await params;
  const { stage, group } = await searchParams;
  setRequestLocale(locale);

  const matches = await listMatches({
    stage: (stage as never) ?? "all",
    groupLabel: group,
  });

  const grouped = groupMatchesByDate(matches);
  const dateKeys = Array.from(grouped.keys()).sort();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {locale === "fr" ? "Matchs" : "Matches"}
        </h1>
        <p className="mt-2 text-text-secondary">
          {locale === "fr"
            ? `Coupe du Monde 2026 · ${matches.length} matchs au programme`
            : `FIFA World Cup 2026 · ${matches.length} matches scheduled`}
        </p>
      </header>

      <StageFilter activeStage={stage} locale={locale as Locale} />

      {matches.length === 0 ? (
        <EmptyState locale={locale as Locale} />
      ) : (
        <div className="space-y-10">
          {dateKeys.map((date) => (
            <section key={date}>
              <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-text-secondary">
                {formatDateHeader(date, locale as Locale)}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.get(date)!.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    locale={locale as Locale}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function StageFilter({
  activeStage,
  locale,
}: {
  activeStage?: string;
  locale: Locale;
}) {
  const stages = [
    { key: "all", fr: "Tous", en: "All" },
    { key: "group", fr: "Groupes", en: "Group stage" },
    { key: "r32", fr: "1/16e", en: "R32" },
    { key: "r16", fr: "8e", en: "R16" },
    { key: "qf", fr: "1/4", en: "QF" },
    { key: "sf", fr: "1/2", en: "SF" },
    { key: "final", fr: "Finale", en: "Final" },
  ];
  const active = activeStage ?? "all";

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {stages.map((s) => {
        const isActive = s.key === active;
        const href = s.key === "all" ? "/matches" : `/matches?stage=${s.key}`;
        return (
          <a
            key={s.key}
            href={href}
            className={
              isActive
                ? "rounded-full bg-primary-500/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-400 ring-1 ring-primary-500/30"
                : "rounded-full border border-border-subtle bg-surface-1/40 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-text-secondary backdrop-blur transition hover:border-border-strong hover:text-text-primary"
            }
          >
            {locale === "fr" ? s.fr : s.en}
          </a>
        );
      })}
    </div>
  );
}

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center backdrop-blur">
      <p className="text-text-secondary">
        {locale === "fr"
          ? "Aucun match disponible. Démarre Supabase local pour charger les données :"
          : "No matches available. Start Supabase locally to load data:"}
      </p>
      <code className="mt-3 inline-block rounded-md bg-surface-3 px-3 py-1.5 font-mono text-xs text-primary-400">
        pnpm db:start && pnpm db:reset
      </code>
    </div>
  );
}

function formatDateHeader(isoDate: string, locale: Locale): string {
  // isoDate is in 'YYYY-MM-DD' format from en-CA
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
