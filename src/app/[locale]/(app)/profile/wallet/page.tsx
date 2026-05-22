import { setRequestLocale } from "next-intl/server";
import { getMyBalance, listMyTransactions } from "@/lib/wallet/queries";
import { Coins, ArrowDownRight, ArrowUpRight } from "lucide-react";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [balance, transactions] = await Promise.all([
    getMyBalance(),
    listMyTransactions(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {locale === "fr" ? "Mon portefeuille" : "My wallet"}
        </h1>
      </header>

      {/* Balance card */}
      <section className="mb-10 rounded-2xl border border-border-subtle bg-surface-1/60 p-8 backdrop-blur shadow-glow-primary/40">
        <div className="flex items-center gap-3 text-text-tertiary">
          <Coins className="size-5 text-primary-500" />
          <span className="text-xs uppercase tracking-wider">
            {locale === "fr" ? "Solde disponible" : "Available balance"}
          </span>
        </div>
        <div className="mt-3 font-display text-6xl font-semibold tabular-nums text-primary-500">
          {Math.floor(balance / 100).toLocaleString()}
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

      {/* Transactions */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-text-secondary">
          {locale === "fr" ? "Historique" : "History"}
          <span className="ml-2 font-mono text-sm text-text-tertiary">
            {transactions.length}
          </span>
        </h2>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface-1/40 p-8 text-center text-sm text-text-tertiary backdrop-blur">
            {locale === "fr"
              ? "Aucune transaction. Place ton premier pari !"
              : "No transactions yet. Place your first bet!"}
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-1/40 backdrop-blur">
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
