import Image from "next/image";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/profile/queries";
import { AppHeader } from "@/components/nav/app-header";
import { ToastProvider } from "@/components/ui/toast-provider";
import { QuickBetProvider } from "@/components/bet/quick-bet-provider";
import { MobileQuickBetFab } from "@/components/nav/mobile-quick-bet-fab";
import { listMatches } from "@/lib/matches/queries";
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

  // Pre-fetch the next openable match for the mobile FAB shortcut.
  const allMatches = await listMatches();
  const now = Date.now();
  const nextOpenMatch =
    allMatches.find(
      (m) =>
        m.status === "scheduled" &&
        new Date(m.kickoff_at).getTime() - now > 60_000,
    ) ?? null;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <AppAtmosphere />
      <ToastProvider>
        <QuickBetProvider locale={locale}>
          <AppHeader user={user} locale={locale} />
          <div className="relative flex-1 pb-20 md:pb-0">{children}</div>
          <MobileQuickBetFab locale={locale} nextMatch={nextOpenMatch} />
        </QuickBetProvider>
      </ToastProvider>
    </div>
  );
}

function AppAtmosphere() {
  return (
    <>
      <Image
        src="/marketing/lucarne-hero-stadium.jpg"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[68%_44%] opacity-[0.18]"
      />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(ellipse_55%_32%_at_18%_0%,rgba(34,217,130,0.16),transparent_68%),radial-gradient(ellipse_42%_30%_at_86%_8%,rgba(124,92,255,0.13),transparent_62%),linear-gradient(180deg,rgba(5,6,5,0.72)_0%,rgba(5,6,5,0.94)_46%,rgba(5,6,5,0.98)_100%)]" />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "linear-gradient(to bottom, black 0%, transparent 80%)",
        }}
      />
    </>
  );
}
