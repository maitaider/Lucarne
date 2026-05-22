import { setRequestLocale } from "next-intl/server";
import { listMyLeagues } from "@/lib/leagues/queries";
import { Link } from "@/i18n/navigation";
import { Plus, Users, Lock, Globe } from "lucide-react";

export default async function LeaguesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const leagues = await listMyLeagues();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            {locale === "fr" ? "Mes ligues" : "My leagues"}
          </h1>
          <p className="mt-2 text-text-secondary">
            {locale === "fr"
              ? `${leagues.length} ligue${leagues.length > 1 ? "s" : ""}`
              : `${leagues.length} league${leagues.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/leagues/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
        >
          <Plus className="size-4" />
          {locale === "fr" ? "Nouvelle ligue" : "New league"}
        </Link>
      </header>

      {leagues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center backdrop-blur">
          <p className="text-text-secondary">
            {locale === "fr"
              ? "Pas encore de ligue. Crée la tienne pour défier tes amis."
              : "No league yet. Create yours to challenge friends."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.slug}`}
              className="group rounded-2xl border border-border-subtle bg-surface-1/60 p-6 backdrop-blur transition hover:border-border-strong hover:bg-surface-2/60"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                    {league.visibility === "private" ? (
                      <>
                        <Lock className="size-3" />
                        {locale === "fr" ? "Privée" : "Private"}
                      </>
                    ) : (
                      <>
                        <Globe className="size-3" />
                        {locale === "fr" ? "Publique" : "Public"}
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary group-hover:text-primary-400">
                    {league.name}
                  </h2>
                  {league.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">
                      {league.description}
                    </p>
                  )}
                </div>
                {league.allows_real_money && (
                  <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
                    €
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-text-tertiary">
                <Users className="size-3" />
                {league.member_count} / {league.member_limit}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
