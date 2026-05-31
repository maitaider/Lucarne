import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/**
 * The jeton "wallet" was retired (predictions are free and scored in points,
 * not jetons). Redirect any old link/bookmark to the profile page. The buy-in
 * (real payment) lives on /buy-in.
 */
export default async function WalletRedirectPage() {
  const locale = (await getLocale()) as Locale;
  redirect({ href: "/profile", locale });
  return null;
}
