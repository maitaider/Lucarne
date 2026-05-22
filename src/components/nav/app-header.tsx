import { Link } from "@/i18n/navigation";
import { LucarneMark } from "@/components/brand/lucarne-mark";
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
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-base/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 transition hover:opacity-80"
        >
          <LucarneMark className="h-7 w-7 text-primary-500" />
          <span className="font-display text-base font-semibold tracking-tight text-text-primary">
            Lucarne
          </span>
        </Link>

        <NavLinks locale={locale} />

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu user={user} locale={locale} />
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-border-subtle bg-surface-1/60 px-4 py-1.5 text-xs font-semibold text-text-primary transition hover:border-border-strong hover:bg-surface-2/60"
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
