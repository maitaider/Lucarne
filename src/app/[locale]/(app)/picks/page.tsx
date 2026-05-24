import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/**
 * Old route: /picks → merged with /bracket under /predict (Groupes by default).
 * 308 permanent redirect preserves bookmarks.
 */
export default async function LegacyPicksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/predict?tab=groupes", locale: locale as Locale });
}
