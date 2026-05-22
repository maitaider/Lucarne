import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LucarneLogo } from "@/components/brand/lucarne-mark";

export async function LandingFooter() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const otherLocale = locale === "fr" ? "en" : "fr";

  return (
    <footer className="border-t border-border-subtle bg-base py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LucarneLogo
            label={tCommon("appName")}
            markClassName="size-6"
            textClassName="text-sm"
          />
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
            className="rounded-[8px] border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-primary-500/35 hover:text-text-primary"
          >
            {t("footerLanguage")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
