import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneMark } from "@/components/brand/lucarne-mark";

export async function LandingFooter() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const otherLocale = locale === "fr" ? "en" : "fr";

  return (
    <footer className="border-t border-border-subtle py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <LucarneMark className="h-5 w-5 text-primary-500" />
          <span className="font-display text-sm font-semibold text-text-primary">
            {tCommon("appName")}
          </span>
          <span className="text-sm text-text-tertiary">
            © {new Date().getFullYear()} · {t("footerRights")}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/rules"
            className="text-text-secondary transition hover:text-text-primary"
          >
            {locale === "fr" ? "Règles" : "Rules"}
          </Link>
          <Link
            href="/privacy"
            className="text-text-secondary transition hover:text-text-primary"
          >
            {locale === "fr" ? "Confidentialité" : "Privacy"}
          </Link>
          <Link
            href="/"
            locale={otherLocale}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary"
          >
            {t("footerLanguage")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
