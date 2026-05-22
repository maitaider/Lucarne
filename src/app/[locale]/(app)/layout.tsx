import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/profile/queries";
import { AppHeader } from "@/components/nav/app-header";
import type { Locale } from "@/i18n/routing";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader user={null} locale={locale} />
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} locale={locale} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
