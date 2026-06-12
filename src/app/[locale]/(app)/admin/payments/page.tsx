import { setRequestLocale } from "next-intl/server";
import {
  getAppSettings,
  listAdminUsers,
  listPayments,
  formatMoney,
} from "@/lib/admin/economy";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { RefundButton } from "@/components/admin/refund-button";
import { DeletePaymentButton } from "@/components/admin/delete-payment-button";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  RotateCcw,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const METHOD_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  transfer: CreditCard,
  paypal: Wallet,
  revolut: Wallet,
  lydia: Wallet,
  wise: Wallet,
  other: Wallet,
};

const METHOD_LABELS: Record<string, { fr: string; en: string }> = {
  cash: { fr: "Espèces", en: "Cash" },
  transfer: { fr: "Virement", en: "Transfer" },
  paypal: { fr: "PayPal", en: "PayPal" },
  revolut: { fr: "Revolut", en: "Revolut" },
  lydia: { fr: "Lydia", en: "Lydia" },
  wise: { fr: "Wise", en: "Wise" },
  other: { fr: "Autre", en: "Other" },
};

export default async function AdminPaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [payments, settings, users] = await Promise.all([
    listPayments({ status: "all", limit: 200 }),
    getAppSettings(),
    listAdminUsers(),
  ]);

  const totalConfirmed = payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount_cents, 0);
  const totalRefunded = payments
    .filter((p) => p.status === "refunded")
    .reduce((s, p) => s + p.amount_cents, 0);

  const fmt = (cents: number) => formatMoney(cents, settings.currency);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            {L === "fr" ? "Argent réel" : "Real money"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {L === "fr"
              ? "Enregistre chaque paiement d'accès reçu hors Stripe (cash, virement, etc.). Ça débloque l'accès du joueur — aucun jeton."
              : "Record every access payment received outside Stripe (cash, transfer, etc.). It unlocks the player's access — no tokens."}
          </p>
        </div>
        <RecordPaymentForm
          users={users.map((u) => ({
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            paid: (u.total_paid_cents ?? 0) > 0,
          }))}
          currency={settings.currency}
          locale={L}
        />
      </header>

      {/* Quick stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={CheckCircle2}
          label={L === "fr" ? "Confirmés" : "Confirmed"}
          value={fmt(totalConfirmed)}
          detail={`${payments.filter((p) => p.status === "confirmed").length} ${L === "fr" ? "paiements" : "payments"}`}
          accent="primary"
        />
        <SummaryCard
          icon={RotateCcw}
          label={L === "fr" ? "Remboursés" : "Refunded"}
          value={fmt(totalRefunded)}
          detail={`${payments.filter((p) => p.status === "refunded").length} ${L === "fr" ? "annulations" : "reversals"}`}
          accent="error"
        />
        <SummaryCard
          icon={Wallet}
          label={L === "fr" ? "En caisse" : "In hand"}
          value={fmt(totalConfirmed)}
          detail={
            L === "fr"
              ? `Prix d'accès : ${fmt(settings.buy_in_amount_cents)}`
              : `Access price: ${fmt(settings.buy_in_amount_cents)}`
          }
          accent="gold"
        />
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-md border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AlertCircle className="mx-auto mb-3 size-6 text-text-tertiary" strokeWidth={1.7} />
            <p className="text-sm text-text-secondary">
              {L === "fr"
                ? "Aucun paiement enregistré."
                : "No payments recorded."}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {L === "fr"
                ? "Clique sur Nouveau paiement pour démarrer."
                : "Click New payment to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.08] bg-white/[0.03]">
                <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
                  <th className="px-4 py-3 text-left font-bold">
                    {L === "fr" ? "Joueur" : "Player"}
                  </th>
                  <th className="px-4 py-3 text-left font-bold">
                    {L === "fr" ? "Méthode" : "Method"}
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    {L === "fr" ? "Montant" : "Amount"}
                  </th>
                  <th className="px-4 py-3 text-left font-bold">Réf.</th>
                  <th className="px-4 py-3 text-left font-bold">Date</th>
                  <th className="px-4 py-3 text-left font-bold">Statut</th>
                  <th className="px-4 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {payments.map((p) => {
                  const Icon = METHOD_ICONS[p.method] ?? Wallet;
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "transition hover:bg-white/[0.03]",
                        p.status === "refunded" && "opacity-60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-text-primary">
                          {p.display_name ?? `@${p.username}`}
                        </div>
                        <div className="text-[10px] text-text-tertiary">
                          @{p.username}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 text-xs text-text-secondary">
                          <Icon
                            className="size-3 text-text-tertiary"
                            strokeWidth={1.7}
                          />
                          {METHOD_LABELS[p.method]?.[L] ?? p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-display text-sm font-bold tabular-nums text-text-primary">
                          {fmt(p.amount_cents)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-text-tertiary">
                          {p.reference ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary">
                          {new Date(p.received_at).toLocaleDateString(
                            L === "fr" ? "fr-FR" : "en-US",
                            { day: "2-digit", month: "short", year: "2-digit" },
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} locale={L} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {p.status === "confirmed" && (
                            <RefundButton paymentId={p.id} locale={L} />
                          )}
                          <DeletePaymentButton paymentId={p.id} locale={L} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent: "primary" | "gold" | "error";
}) {
  const ring = {
    primary: "bg-primary-500/12 text-primary-300 ring-primary-500/30",
    gold: "bg-gold-500/12 text-gold-300 ring-gold-500/30",
    error: "bg-error/12 text-error ring-error/30",
  }[accent];
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={cn("rounded-md p-1.5 ring-1", ring)}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-bold tabular-nums text-text-primary">
        {value}
      </div>
      <p className="mt-1 text-xs text-text-tertiary">{detail}</p>
    </div>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const config = {
    confirmed: {
      Icon: CheckCircle2,
      label: locale === "fr" ? "Confirmé" : "Confirmed",
      style: "bg-primary-500/15 text-primary-300 ring-primary-500/30",
    },
    refunded: {
      Icon: RotateCcw,
      label: locale === "fr" ? "Remboursé" : "Refunded",
      style: "bg-error/15 text-error ring-error/30",
    },
    pending: {
      Icon: AlertCircle,
      label: locale === "fr" ? "En attente" : "Pending",
      style: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
    },
    cancelled: {
      Icon: XCircle,
      label: locale === "fr" ? "Annulé" : "Cancelled",
      style: "bg-white/10 text-text-tertiary ring-white/15",
    },
  }[status as "confirmed" | "refunded" | "pending" | "cancelled"];
  if (!config) return null;
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
        config.style,
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
