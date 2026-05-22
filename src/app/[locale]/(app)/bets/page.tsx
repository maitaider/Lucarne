import { setRequestLocale } from "next-intl/server";
import { listMyBets } from "@/lib/bets/queries";
import { BetCard } from "@/components/bet/bet-card";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export default async function MyBetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const bets = await listMyBets();

  const groups = {
    pending: bets.filter((b) =>
      ["pending_payment", "paid"].includes(b.status),
    ),
    validated: bets.filter((b) => b.status === "validated"),
    settled: bets.filter((b) => b.status === "settled"),
    other: bets.filter((b) =>
      ["rejected", "refunded"].includes(b.status),
    ),
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            {locale === "fr" ? "Mes paris" : "My bets"}
          </h1>
          <p className="mt-2 text-text-secondary">
            {locale === "fr"
              ? `${bets.length} pari${bets.length > 1 ? "s" : ""} placé${bets.length > 1 ? "s" : ""}`
              : `${bets.length} bet${bets.length > 1 ? "s" : ""} placed`}
          </p>
        </div>
        <Link
          href="/matches"
          className="rounded-lg border border-border-strong bg-surface-1/60 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur transition hover:border-primary-500/60 hover:bg-surface-2"
        >
          {locale === "fr" ? "+ Nouveau pari" : "+ New bet"}
        </Link>
      </header>

      {bets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center backdrop-blur">
          <p className="text-text-secondary">
            {locale === "fr"
              ? "Aucun pari pour le moment. Pars choisir un match !"
              : "No bets yet. Go pick a match!"}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <Section
            title={locale === "fr" ? "En attente de validation" : "Awaiting validation"}
            bets={groups.pending}
            locale={locale as Locale}
          />
          <Section
            title={locale === "fr" ? "Validés (en cours)" : "Validated (active)"}
            bets={groups.validated}
            locale={locale as Locale}
          />
          <Section
            title={locale === "fr" ? "Résolus" : "Settled"}
            bets={groups.settled}
            locale={locale as Locale}
          />
          <Section
            title={locale === "fr" ? "Autres" : "Other"}
            bets={groups.other}
            locale={locale as Locale}
          />
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  bets,
  locale,
}: {
  title: string;
  bets: Awaited<ReturnType<typeof listMyBets>>;
  locale: Locale;
}) {
  if (bets.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-text-secondary">
        {title}
        <span className="ml-2 font-mono text-sm text-text-tertiary">{bets.length}</span>
      </h2>
      <div className="space-y-3">
        {bets.map((bet) => (
          <BetCard key={bet.id} bet={bet} locale={locale} />
        ))}
      </div>
    </section>
  );
}
