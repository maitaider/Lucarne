import { redirect } from "@/i18n/navigation";
import { AppAtmosphere } from "@/components/layout/app-atmosphere";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/profile/queries";
import { AppHeader } from "@/components/nav/app-header";
import { ToastProvider } from "@/components/ui/toast-provider";
import { QuickBetProvider } from "@/components/bet/quick-bet-provider";
import { MobileQuickBetFab } from "@/components/nav/mobile-quick-bet-fab";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { ChunkReloadGuard } from "@/components/system/chunk-reload-guard";
import { SiteFooter } from "@/components/layout/site-footer";
import { listMatches } from "@/lib/matches/queries";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import type { Locale } from "@/i18n/routing";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
        <AppAtmosphere />
        <ToastProvider>
          <QuickBetProvider locale={locale}>
            <AppHeader user={null} locale={locale} />
            <div className="relative flex-1">{children}</div>
          </QuickBetProvider>
        </ToastProvider>
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  // Pre-fetch the next openable match for the mobile FAB shortcut — but only
  // when the player can actually bet. When predictions are frozen (global lock
  // passed / unpaid), hide the FAB so it can't lead to a locked place_bet.
  const [allMatches, buyIn] = await Promise.all([
    listMatches(),
    getMyBuyInStatus(),
  ]);
  const now = Date.now();
  const nextOpenMatch = buyIn.can_bet
    ? (allMatches.find(
        (m) =>
          m.status === "scheduled" &&
          new Date(m.kickoff_at).getTime() - now > 60_000,
      ) ?? null)
    : null;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <AppAtmosphere />
      <ChunkReloadGuard />
      <ToastProvider>
        <QuickBetProvider locale={locale}>
          <AppHeader user={user} locale={locale} />
          <div className="relative flex-1 pb-20 md:pb-0">{children}</div>
          <SiteFooter locale={locale} />
          <MobileQuickBetFab locale={locale} nextMatch={nextOpenMatch} />
          <OnboardingTour locale={locale} />
        </QuickBetProvider>
      </ToastProvider>
    </div>
  );
}

