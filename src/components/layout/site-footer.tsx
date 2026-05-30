import type { Locale } from "@/i18n/routing";

/**
 * Global footer banner. Sits at the bottom of every page with a subtle
 * "by Mehdi" credit.
 */
export function SiteFooter({ locale = "fr" }: { locale?: Locale }) {
  const fr = locale === "fr";
  return (
    <footer className="relative z-10 mt-20 border-t border-white/[0.07] bg-black/30 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-text-tertiary">
          Lucarne · {fr ? "Coupe du Monde 2026" : "World Cup 2026"}
        </p>
        <p className="text-xs text-text-tertiary">
          {fr ? "Conçu et développé " : "Designed & built "}
          <span className="font-semibold text-primary-300">by Mehdi</span>
          <span className="mx-1.5 text-white/20">·</span>
          <span className="tabular-nums">© 2026</span>
        </p>
      </div>
    </footer>
  );
}
