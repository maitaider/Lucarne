import { setRequestLocale } from "next-intl/server";
import { getMyBalance, listMyTransactions } from "@/lib/wallet/queries";
import { isStripeConfigured } from "@/lib/stripe/server";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { SectionPanel } from "@/components/layout/section-panel";
import { EmptyStateVisual } from "@/components/layout/empty-state-visual";
import { BuyInCard } from "@/components/wallet/buy-in-card";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Receipt,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [balance, transactions, buyIn] = await Promise.all([
    getMyBalance(),
    listMyTransactions(),
    getMyBuyInStatus(),
  ]);
  const stripeReady = isStripeConfigured();
  const balanceTokens = Math.floor(balance / 100);

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={L === "fr" ? "Portefeuille" : "Wallet"}
        kickerIcon={Coins}
        accent="gold"
        title={
          L === "fr"
            ? "Ta place + ton historique"
            : "Your seat + your history"
        }
        description={
          L === "fr"
            ? "Statut de ta place tournoi, mouvements de solde et accès direct à la cagnotte projetée."
            : "Your seat status, balance movements, and direct access to the projected prize pool."
        }
        stats={
          <>
            <WalletStat
              label={L === "fr" ? "Solde" : "Balance"}
              value={`${balanceTokens.toLocaleString(L === "fr" ? "fr-FR" : "en-US")} ${L === "fr" ? "jetons" : "tokens"}`}
              tone="gold"
            />
            <WalletStat
              label={L === "fr" ? "Mouvements" : "Movements"}
              value={`${transactions.length}`}
              tone="primary"
            />
          </>
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/10-wallet-prize-pool.svg",
          alt:
            L === "fr"
              ? "Cagnotte et solde Lucarne"
              : "Lucarne prize pool and balance",
        }}
      />

      {/* Buy-in card / seat status */}
      <BuyInCard
        amountCents={buyIn.amount_cents}
        currency={buyIn.settings.currency}
        stripeReady={stripeReady}
        alreadyPaid={buyIn.paid || buyIn.is_admin}
        deadlinePassed={buyIn.deadline_passed}
        deadlineAt={buyIn.deadline_at}
        locale={L}
      />

      {/* History */}
      <SectionPanel
        icon={Receipt}
        title={L === "fr" ? "Historique" : "History"}
        badge={transactions.length}
        accent="neutral"
        padded={false}
      >
        {transactions.length === 0 ? (
          <div className="p-4">
            <EmptyStateVisual
              src="/assets/lucarne/claude-pack-20260525/svg/10-wallet-prize-pool.svg"
              alt={
                L === "fr"
                  ? "Aucun mouvement pour le moment"
                  : "No movement yet"
              }
              title={
                L === "fr"
                  ? "Aucun mouvement pour le moment"
                  : "No movement yet"
              }
              body={
                L === "fr"
                  ? "Tes paiements, bonus et gains apparaîtront ici avec le solde après opération."
                  : "Payments, bonuses, and winnings will appear here with the post-operation balance."
              }
              compact
            />
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={
                    tx.direction === "credit"
                      ? "flex size-8 items-center justify-center rounded-full bg-primary-500/15 text-primary-400 ring-1 ring-primary-500/25"
                      : "flex size-8 items-center justify-center rounded-full bg-white/[0.05] text-text-secondary ring-1 ring-white/[0.08]"
                  }
                >
                  {tx.direction === "credit" ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : (
                    <ArrowUpRight className="size-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-primary">
                    {reasonLabel(tx.reason, L)}
                  </div>
                  <div className="font-mono text-[10px] text-text-tertiary">
                    {new Date(tx.created_at).toLocaleString(
                      L === "fr" ? "fr-CA" : "en-CA",
                      { dateStyle: "medium", timeStyle: "short" },
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={
                      tx.direction === "credit"
                        ? "font-display text-sm font-bold tabular-nums text-primary-300"
                        : "font-display text-sm font-bold tabular-nums text-text-secondary"
                    }
                  >
                    {tx.direction === "credit" ? "+" : "−"}
                    {tx.amount_cents.toLocaleString()}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
                    {L === "fr" ? "Solde" : "Bal."}{" "}
                    {tx.balance_after_cents.toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </AppPageShell>
  );
}

function WalletStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "gold" | "violet";
}) {
  const cls = {
    primary: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
    gold: "border-gold-500/35 bg-gold-500/[0.08] text-gold-300",
    violet: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
      <span className="font-mono normal-case text-text-primary">{value}</span>
    </span>
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
