import { setRequestLocale } from "next-intl/server";
import { CreateLeagueForm } from "./create-league-form";

export default async function NewLeaguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 lg:px-8">
      <header className="mb-8 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.66] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <h1 className="mb-2 font-display text-3xl font-semibold text-text-primary">
          {locale === "fr" ? "Nouvelle ligue" : "New league"}
        </h1>
        <p className="text-text-secondary">
          {locale === "fr"
            ? "Crée une ligue privée pour défier ton cercle. Tu en seras propriétaire et tu pourras inviter qui tu veux."
            : "Create a private league to challenge your crew. You'll be its owner and can invite whoever you want."}
        </p>
      </header>
      <CreateLeagueForm locale={locale === "fr" ? "fr" : "en"} />
    </main>
  );
}
