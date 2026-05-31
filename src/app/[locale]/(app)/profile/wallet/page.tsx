import { setRequestLocale } from "next-intl/server";
import { listMyPayments, getMyBuyInStatus } from "@/lib/profile/buy-in";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Receipt, CheckCircle2, Clock, RotateCcw, ArrowRight } from "lucide-react";

const METHOD_LABELS: Record<string, { fr: string; en: string }> = {
  cash: { fr: "Espèces", en: "Cash" },
  transfer: { fr: "Virement", en: "Transfer" },
  paypal: { fr: "PayPal", en: "PayPal" },
  revolut: { fr: "Revolut", en: "Revolut" },
  lydia: { fr: "Lydia", en: "Lydia" },
  wise: { fr: "Wise", en: "Wise" },
  other: { fr: "En ligne", en: "Online" },
};

export default async function ReceiptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [payments, status] = await Promise.all([
    listMyPayments(),
    getMyBuyInStatus(),
  ]);

  const fmt = (cents: number, currency: string) =>
    (cents / 100).toLocaleString(L === "fr" ? "fr-FR" : "en-US", {
      style: "currency",
      currency: currency || status.settings.currency,
    });

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={L === "fr" ? "Mon accès" : "My access"}
        kickerIcon={Receipt}
        accent="gold"
        title={L === "fr" ? "Mes paiements" : "My payments"}
        description={
          L === "fr"
            ? "Le récapitulatif de ton paiement d'accès à Lucarne. Les pronostics, eux, sont gratuits et comptés en points."
            : "A summary of your Lucarne access payment. Predictions themselves are free and scored in points."
        }
      />

      {/* Access status banner */}
      <section className="mb-6 rounded-[10px] border border-white/[0.08] bg-surface-1/[0.6] p-5 backdrop-blur-xl">
        {status.is_admin ? (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckCircle2 className="size-4 text-primary-400" strokeWidth={1.8} />
            {L === "fr"
              ? "Accès organisateur — illimité."
              : "Organizer access — unlimited."}
          </p>
        ) : status.paid ? (
          <p className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckCircle2 className="size-4 text-primary-400" strokeWidth={1.8} />
            {L === "fr"
              ? `Accès actif depuis le ${new Date(status.paid_at!).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}.`
              : `Access active since ${new Date(status.paid_at!).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}.`}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock className="size-4 text-gold-400" strokeWidth={1.8} />
              {L === "fr"
                ? `Accès non réglé — ${fmt(status.amount_cents, status.settings.currency)} unique.`
                : `Access not paid — ${fmt(status.amount_cents, status.settings.currency)} one-time.`}
            </p>
            <Link
              href="/buy-in"
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
            >
              <ArrowRight className="size-4" strokeWidth={2} />
              {L === "fr" ? "Débloquer l'accès" : "Unlock access"}
            </Link>
          </div>
        )}
      </section>

      {/* Receipts list */}
      {payments.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.14] bg-surface-1/[0.6] p-8 text-center">
          <Receipt className="mx-auto mb-3 size-6 text-text-tertiary" strokeWidth={1.6} />
          <p className="text-sm text-text-secondary">
            {L === "fr"
              ? "Aucun paiement enregistré pour le moment."
              : "No payment recorded yet."}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-md border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
          <ul className="divide-y divide-white/[0.06]">
            {payments.map((p) => {
              const refunded = p.status === "refunded";
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold tabular-nums text-text-primary">
                        {fmt(p.amount_cents, p.currency)}
                      </span>
                      {refunded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
                          <RotateCcw className="size-3" />
                          {L === "fr" ? "Remboursé" : "Refunded"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-400">
                          <CheckCircle2 className="size-3" />
                          {L === "fr" ? "Confirmé" : "Confirmed"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {METHOD_LABELS[p.method]?.[L] ?? p.method}
                      {p.reference ? ` · ${p.reference.slice(0, 18)}` : ""}
                    </p>
                  </div>
                  <time
                    dateTime={p.received_at}
                    className="text-xs text-text-secondary"
                  >
                    {new Date(p.received_at).toLocaleDateString(
                      L === "fr" ? "fr-FR" : "en-US",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppPageShell>
  );
}
