import { setRequestLocale } from "next-intl/server";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

// The hero shows live fixtures (next-match countdown target + latest results),
// so the page must reflect the current schedule on every visit instead of
// freezing it into build-time static HTML.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="relative">
      <LandingHero />
      <LandingFeatures />
      <LandingCta />
      <LandingFooter />
    </main>
  );
}
