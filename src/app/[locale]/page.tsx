import { setRequestLocale } from "next-intl/server";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

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
