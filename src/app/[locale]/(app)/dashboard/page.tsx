import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
        Dashboard
      </h1>
      <p className="mt-4 text-text-secondary">
        {locale === "fr"
          ? "Tableau de bord à venir — Sprint 3."
          : "Dashboard coming soon — Sprint 3."}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-surface-1/60 p-5">
          <div className="text-xs uppercase tracking-wider text-text-tertiary">
            Solde
          </div>
          <div className="mt-2 font-display text-3xl font-semibold tabular-nums text-primary-500">
            1 000
            <span className="ml-1 text-sm text-text-secondary">jetons</span>
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1/60 p-5">
          <div className="text-xs uppercase tracking-wider text-text-tertiary">
            Paris en cours
          </div>
          <div className="mt-2 font-display text-3xl font-semibold tabular-nums text-text-primary">
            0
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1/60 p-5">
          <div className="text-xs uppercase tracking-wider text-text-tertiary">
            Classement
          </div>
          <div className="mt-2 font-display text-3xl font-semibold tabular-nums text-gold-500">
            —
          </div>
        </div>
      </div>
    </main>
  );
}
