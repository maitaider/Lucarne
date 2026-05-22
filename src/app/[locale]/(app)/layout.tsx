import { redirect } from "@/i18n/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { LucarneMark } from "@/components/brand/lucarne-mark";
import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  // Only check session if Supabase is configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect({ href: "/login", locale });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border-subtle bg-surface-1/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LucarneMark className="h-6 w-6 text-primary-500" />
            <span className="font-display text-base font-semibold tracking-tight text-text-primary">
              Lucarne
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-text-secondary">
            <Link href="/dashboard" className="hover:text-text-primary">
              Dashboard
            </Link>
            <Link href="/matches" className="hover:text-text-primary">
              Matchs
            </Link>
            <Link href="/leagues" className="hover:text-text-primary">
              Ligues
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
