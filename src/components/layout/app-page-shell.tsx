import { cn } from "@/lib/utils";

/**
 * Standard outer wrapper for every connected (authed) page.
 *
 * Provides a consistent max-width + horizontal padding + vertical rhythm
 * so callers can stop hand-tuning `max-w-*` / `px-*` per page. The width
 * presets map to the three main page densities:
 *   - "narrow" (4xl)  → text-heavy pages (how-it-works, news article)
 *   - "wide"   (5xl)  → most app pages (predict, live, leagues)
 *   - "ultra"  (6xl)  → bracket / leaderboard / dashboard with side rails
 *   - "max"    (1600) → command-center dashboards
 *
 * Children are stacked vertically with a uniform gap so sections don't
 * need to manage their own `mt-*`.
 */
export function AppPageShell({
  children,
  width = "wide",
  className,
}: {
  children: React.ReactNode;
  width?: "narrow" | "wide" | "ultra" | "max";
  className?: string;
}) {
  const maxClass = {
    narrow: "max-w-4xl",
    wide: "max-w-[1400px]",
    ultra: "max-w-[1600px]",
    max: "max-w-[1760px]",
  }[width];
  return (
    <main
      className={cn(
        "mx-auto flex flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8",
        maxClass,
        className,
      )}
    >
      {children}
    </main>
  );
}
