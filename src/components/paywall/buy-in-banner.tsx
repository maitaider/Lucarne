import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/admin/money";
import { ArrowRight, CalendarClock, Ticket } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Compact gold banner shown above the dashboard / matches page when the
 * current user hasn't paid their buy-in yet. Sells the seat in one line
 * and ships them to /buy-in.
 */
export function BuyInBanner({
  amountCents,
  currency,
  deadlineAt,
  deadlinePassed,
  locale,
}: {
  amountCents: number;
  currency: string;
  deadlineAt: string;
  deadlinePassed: boolean;
  locale: Locale;
}) {
  const moneyLocale = locale === "fr" ? "fr-CA" : "en-CA";
  const deadlineLabel = new Date(deadlineAt).toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { day: "numeric", month: "long", year: "numeric" },
  );

  if (deadlinePassed) {
    return (
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-white/[0.12] bg-white/[0.05] px-4 py-3 text-sm text-text-secondary">
        <div className="flex items-start gap-2.5">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
          <span>
            {locale === "fr"
              ? "L'accès n'est plus en vente. Tu peux suivre le tournoi en lecture."
              : "Access is no longer on sale. You can follow the tournament in read-only mode."}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="group/banner relative mb-6 overflow-hidden rounded-[12px] border border-gold-500/35 bg-gradient-to-r from-gold-500/[0.15] via-primary-500/[0.06] to-transparent backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gold-500/25 blur-3xl"
      />
      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold">
            <Ticket className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {locale === "fr" ? "Action requise" : "Action required"}
            </div>
            <div className="font-display text-base font-semibold tracking-tight text-text-primary sm:text-lg">
              {locale === "fr"
                ? `Accède à toute la Coupe du Monde pour ${formatMoney(amountCents, currency, moneyLocale)}`
                : `Unlock full World Cup access for ${formatMoney(amountCents, currency, moneyLocale)}`}
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              {locale === "fr"
                ? `Vente ouverte jusqu’au ${deadlineLabel}. Modifie tes pronostics jusqu’à 1 h avant chaque match.`
                : `Sales open until ${deadlineLabel}. Edit picks up to 1 h before each match.`}
            </div>
          </div>
        </div>
        <Link
          href="/buy-in"
          className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-gold-500 px-4 py-2 text-sm font-bold text-abyss shadow-glow-gold transition hover:bg-gold-400"
        >
          {locale === "fr" ? "Débloquer l'accès" : "Unlock access"}
          <ArrowRight
            className="size-4 transition group-hover/banner:translate-x-0.5"
            strokeWidth={2.5}
          />
        </Link>
      </div>
    </section>
  );
}
