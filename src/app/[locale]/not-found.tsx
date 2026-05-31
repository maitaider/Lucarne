import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Compass, ArrowRight } from "lucide-react";

/**
 * Localized 404 for anything under /[locale] (e.g. a match/team id that doesn't
 * exist calling notFound()). Keeps the brand shell instead of the bare default.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-primary-500/12 text-primary-300 ring-1 ring-primary-500/30">
        <Compass className="size-7" strokeWidth={1.6} />
      </span>
      <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-text-tertiary">
        404
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-text-primary">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {t("body")}
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
      >
        {t("back")}
        <ArrowRight className="size-4" strokeWidth={2} />
      </Link>
    </main>
  );
}
