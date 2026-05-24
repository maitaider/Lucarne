import { setRequestLocale } from "next-intl/server";
import { getMyBalance, listMyTransactions } from "@/lib/wallet/queries";
import { isStripeConfigured } from "@/lib/stripe/server";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { BuyInCard } from "@/components/wallet/buy-in-card";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Receipt,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [balance, transactions, buyIn] = await Promise.all([
    getMyBalance(),
    listMyTransactions(),
    getMyBuyInStatus(),
  ]);
  const stripeReady = isStripeConfigured();
  const L = locale as Locale;
  const credits = transactions.filter((tx) => tx.direction === "credit").length;
  const debits = transactions.filter((tx) => tx.direction === "debit").length;
  const balanceTokens = Math.floor(balance / 100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <header className="mb-4 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.68] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
              <Coins className="size-3.5" strokeWidth={1.7} />
              {locale === "fr" ? "Banque de jetons" : "Token bank"}
            </div>
            <h1 className="font-display text-3xl font-semibold text-text-primary sm:text-4xl">
              {locale === "fr" ? "Portefeuille" : "Wallet"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {locale === "fr"
                ? "Vue claire sur le solde disponible, les mouvements de mise et les gains qui alimentent ta stratégie Mondial."
                : "A clear view of available balance, stake movements, and winnings that power your World Cup strategy."}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[480px]">
            <WalletMetric
              icon={Trophy}
              label={locale === "fr" ? "Solde" : "Balance"}
              value={balanceTokens.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
              detail={locale === "fr" ? "jetons" : "tokens"}
              accent="gold"
            />
            <WalletMetric
              icon={ArrowDownRight}
              label={locale === "fr" ? "Crédits" : "Credits"}
              value={credits}
              detail={locale === "fr" ? "entrées" : "inflows"}
              accent="primary"
            />
            <WalletMetric
              icon={ArrowUpRight}
              label={locale === "fr" ? "Débits" : "Debits"}
              value={debits}
              detail={locale === "fr" ? "mises/sorties" : "stakes/outflows"}
              accent="violet"
            />
          </div>
        </div>
      </header>

      {/* Balance card */}
      <section className="mb-10 rounded-[8px] border border-primary-500/[0.18] bg-gradient-to-br from-primary-500/[0.12] via-surface-1/[0.76] to-surface-2/[0.64] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex items-center gap-3 text-text-tertiary">
          <Coins className="size-5 text-primary-500" />
          <span className="text-xs uppercase tracking-wider">
            {locale === "fr" ? "Solde disponible" : "Available balance"}
          </span>
        </div>
        <div className="mt-3 font-display text-6xl font-semibold tabular-nums text-primary-500">
          {balanceTokens.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
          <span className="ml-2 text-xl text-text-secondary">
            {locale === "fr" ? "jetons" : "chips"}
          </span>
        </div>
        <p className="mt-2 text-sm text-text-tertiary">
          {locale === "fr"
            ? "Cumul de tes paris non résolus + gains disponibles."
            : "Sum of unsettled stakes + winnings available."}
        </p>
      </section>

      {/* Buy-in (Stripe) */}
      <div className="mb-10">
        <BuyInCard
          amountCents={buyIn.amount_cents}
          currency={buyIn.settings.currency}
          stripeReady={stripeReady}
          alreadyPaid={buyIn.paid || buyIn.is_admin}
          deadlinePassed={buyIn.deadline_passed}
          deadlineAt={buyIn.deadline_at}
          locale={L}
        />
      </div>

      {/* Transactions */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-text-secondary">
          {locale === "fr" ? "Historique" : "History"}
          <span className="ml-2 font-mono text-sm text-text-tertiary">
            {transactions.length}
          </span>
        </h2>
        {transactions.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="rounded-[8px] bg-gold-500/15 p-2.5 text-gold-400 ring-1 ring-gold-500/30">
                <Receipt className="size-5" strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {locale === "fr" ? "Historique prêt" : "History ready"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {locale === "fr"
                    ? "Les bonus, mises, remboursements et gains apparaîtront ici avec leur solde après opération."
                    : "Bonuses, stakes, refunds, and winnings will appear here with the post-operation balance."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-[8px] border border-white/[0.08] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className={
                    tx.direction === "credit"
                      ? "flex size-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-500"
                      : "flex size-9 items-center justify-center rounded-full bg-surface-3 text-text-secondary"
                  }
                >
                  {tx.direction === "credit" ? (
                    <ArrowDownRight className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {reasonLabel(tx.reason, locale)}
                  </div>
                  <div className="font-mono text-xs text-text-tertiary">
                    {new Date(tx.created_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      tx.direction === "credit"
                        ? "font-display text-lg font-semibold tabular-nums text-primary-500"
                        : "font-display text-lg font-semibold tabular-nums text-text-secondary"
                    }
                  >
                    {tx.direction === "credit" ? "+" : "−"}
                    {tx.amount_cents.toLocaleString()}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                    {locale === "fr" ? "Solde" : "Bal."}{" "}
                    {tx.balance_after_cents.toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function WalletMetric({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  accent: "primary" | "gold" | "violet";
}) {
  const color = {
    primary: "border-primary-500/25 bg-primary-500/[0.09] text-primary-400",
    gold: "border-gold-500/30 bg-gold-500/[0.09] text-gold-400",
    violet: "border-violet-500/25 bg-violet-500/[0.09] text-violet-400",
  }[accent];

  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-[8px] border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{detail}</div>
    </div>
  );
}

function reasonLabel(reason: string, locale: string): string {
  const map: Record<string, { fr: string; en: string }> = {
    signup_bonus: { fr: "Bonus d'inscription", en: "Signup bonus" },
    bet_stake: { fr: "Mise sur un pari", en: "Bet stake" },
    bet_payout: { fr: "Gains d'un pari", en: "Bet payout" },
    bet_refund: { fr: "Remboursement", en: "Refund" },
    manual_adjustment: { fr: "Ajustement admin", en: "Admin adjustment" },
    league_entry: { fr: "Frais de ligue", en: "League entry" },
    prize: { fr: "Prix", en: "Prize" },
    onboarding_quest: { fr: "Quête onboarding", en: "Onboarding quest" },
  };
  return map[reason]?.[locale as "fr" | "en"] ?? reason;
}
