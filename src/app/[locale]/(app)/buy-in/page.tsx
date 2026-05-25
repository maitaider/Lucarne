import { setRequestLocale } from "next-intl/server";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { isStripeConfigured } from "@/lib/stripe/server";
import { formatMoney } from "@/lib/admin/economy";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { SectionPanel } from "@/components/layout/section-panel";
import { BuyInCard } from "@/components/wallet/buy-in-card";
import {
  CalendarClock,
  CheckCircle2,
  Crown,
  Sparkles,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function BuyInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stripe?: string }>;
}) {
  const { locale } = await params;
  const { stripe } = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const status = await getMyBuyInStatus();
  const stripeReady = isStripeConfigured();
  const moneyLocale = L === "fr" ? "fr-CA" : "en-CA";
  const priceLabel = formatMoney(
    status.amount_cents,
    status.settings.currency,
    moneyLocale,
  );

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={L === "fr" ? "Place Mondial 2026" : "World Cup 2026 seat"}
        kickerIcon={Ticket}
        accent="gold"
        title={
          L === "fr"
            ? "Un seul paiement, tout le tournoi."
            : "One payment, the whole tournament."
        }
        description={
          L === "fr"
            ? `Pour ${priceLabel}, tu débloques tous les pronostics sur les 104 matchs. Pas d'abonnement, pas de relance, pas de mise minimale. Le top 3 du classement final se partage la cagnotte.`
            : `For ${priceLabel} you unlock predictions on all 104 matches. No subscription, no upsell, no minimum stake. The top 3 split the prize pool at the end.`
        }
        visual={{
          src: "/assets/lucarne/claude-pack-20260525/svg/07-buy-in-gold-seat.svg",
          alt:
            L === "fr"
              ? "Illustration de la place achetée — siège or"
              : "Gold seat — purchased entry",
          priority: true,
        }}
      />

      {stripe === "success" && (
        <div className="flex items-start gap-3 rounded-[8px] border border-primary-500/35 bg-primary-500/[0.1] px-4 py-3 text-sm text-primary-200">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">
              {L === "fr" ? "Paiement reçu !" : "Payment received!"}
            </div>
            <div className="mt-0.5 text-text-secondary">
              {L === "fr"
                ? "Ton paiement est en cours de validation. L'accès aux pronos s'ouvre dans quelques secondes — recharge la page si besoin."
                : "Your payment is being confirmed. Predictions unlock within seconds — refresh the page if needed."}
            </div>
          </div>
        </div>
      )}
      {stripe === "cancelled" && (
        <div className="rounded-[8px] border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-text-secondary">
          {L === "fr"
            ? "Paiement annulé — tu peux relancer quand tu veux."
            : "Payment cancelled — you can restart whenever."}
        </div>
      )}

      <BuyInCard
        amountCents={status.amount_cents}
        currency={status.settings.currency}
        stripeReady={stripeReady}
        alreadyPaid={status.paid || status.is_admin}
        deadlinePassed={status.deadline_passed}
        deadlineAt={status.deadline_at}
        locale={L}
      />

      {/* Timeline: Paye → Pronostique → Suis → Podium */}
      <SectionPanel
        icon={Sparkles}
        title={L === "fr" ? "Ton parcours en 4 étapes" : "Your 4-step journey"}
        accent="primary"
      >
        <ol className="grid gap-3 sm:grid-cols-4">
          <Step
            n={1}
            icon={Ticket}
            title={L === "fr" ? "Paie" : "Pay"}
            body={
              L === "fr"
                ? "Un paiement unique de " + priceLabel + " via Stripe."
                : "One-time " + priceLabel + " via Stripe."
            }
            done={status.paid || status.is_admin}
          />
          <Step
            n={2}
            icon={Sparkles}
            title={L === "fr" ? "Pronostique" : "Predict"}
            body={
              L === "fr"
                ? "Classe les groupes + bâtis ton arbre. Modifiable jusqu'au verrou."
                : "Rank groups + build the bracket. Editable until the lock."
            }
          />
          <Step
            n={3}
            icon={CalendarClock}
            title={L === "fr" ? "Suis le live" : "Follow live"}
            body={
              L === "fr"
                ? "Scores et news Hermes pendant les 104 matchs."
                : "Scores and Hermes news through all 104 matches."
            }
          />
          <Step
            n={4}
            icon={Crown}
            title={L === "fr" ? "Podium" : "Podium"}
            body={
              L === "fr"
                ? "Top 3 du classement final se partage la cagnotte."
                : "Top 3 split the prize pool at the end."
            }
          />
        </ol>
      </SectionPanel>

      <p className="text-center text-xs text-text-tertiary">
        {L === "fr" ? "Déjà payé ? " : "Already paid? "}
        <a
          href="/dashboard"
          className="font-semibold text-primary-400 hover:text-primary-300"
        >
          {L === "fr" ? "Aller au dashboard" : "Open dashboard"}
        </a>
      </p>
    </AppPageShell>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
  done = false,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  done?: boolean;
}) {
  return (
    <li
      className={`rounded-[8px] border p-3 ${
        done
          ? "border-primary-500/35 bg-primary-500/[0.05]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`flex size-7 items-center justify-center rounded-[6px] ${
            done
              ? "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30"
              : "bg-white/[0.05] text-text-tertiary ring-1 ring-white/[0.08]"
          }`}
        >
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
        <span className="font-mono text-[10px] font-bold tabular-nums text-text-tertiary">
          {String(n).padStart(2, "0")}
        </span>
      </div>
      <div className="font-display text-sm font-semibold text-text-primary">
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{body}</p>
    </li>
  );
}

