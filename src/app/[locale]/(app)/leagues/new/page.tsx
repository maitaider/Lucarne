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
      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
        {locale === "fr" ? "Nouvelle ligue" : "New league"}
      </h1>
      <p className="mb-8 text-text-secondary">
        {locale === "fr"
          ? "Crée une ligue privée pour défier ton cercle. Tu en seras propriétaire et tu pourras inviter qui tu veux."
          : "Create a private league to challenge your crew. You'll be its owner and can invite whoever you want."}
      </p>
      <CreateLeagueForm locale={locale === "fr" ? "fr" : "en"} />
    </main>
  );
}
