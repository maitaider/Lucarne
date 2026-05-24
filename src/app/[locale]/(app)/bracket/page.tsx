import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/**
 * Old route: /bracket → merged with /picks under /predict (Phase finale).
 * 308 permanent redirect preserves bookmarks.
 */
export default async function LegacyBracketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/predict?tab=finale", locale: locale as Locale });
}
