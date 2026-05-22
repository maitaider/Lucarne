import { Link } from "@/i18n/navigation";
import { LucarneLogo } from "@/components/brand/lucarne-mark";
import { UserMenu } from "./user-menu";
import { NavLinks } from "./nav-links";
import { MobileMenu } from "./mobile-menu";
import type { CurrentUser } from "@/lib/profile/queries";
import type { Locale } from "@/i18n/routing";

export function AppHeader({
  user,
  locale,
}: {
  user: CurrentUser | null;
  locale: Locale;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-abyss/[0.68] shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="transition hover:opacity-85"
        >
          <LucarneLogo markClassName="size-7" textClassName="text-base" />
        </Link>

        <NavLinks locale={locale} />

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu user={user} locale={locale} />
          ) : (
            <Link
              href="/login"
              className="rounded-[8px] border border-white/[0.12] bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-text-primary transition hover:border-primary-500/45 hover:bg-primary-500/[0.08]"
            >
              {locale === "fr" ? "Connexion" : "Sign in"}
            </Link>
          )}
          {user && <MobileMenu locale={locale} />}
        </div>
      </div>
    </header>
  );
}
