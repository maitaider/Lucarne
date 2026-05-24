import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { isStripeConfigured } from "@/lib/stripe/server";
import { formatMoney } from "@/lib/admin/economy";
import { BuyInCard } from "@/components/wallet/buy-in-card";
import { CalendarClock, CheckCircle2, ShieldCheck, Trophy } from "lucide-react";
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

  const [status] = await Promise.all([getMyBuyInStatus()]);
  const stripeReady = isStripeConfigured();
  const moneyLocale = L === "fr" ? "fr-CA" : "en-CA";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative mb-8 overflow-hidden rounded-[14px] border border-white/[0.13] bg-abyss/[0.78] p-6 shadow-[0_38px_120px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-8">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[55%_45%] opacity-[0.32]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.93)_0%,rgba(5,6,5,0.78)_38%,rgba(5,6,5,0.46)_100%)]" />

        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
            <Trophy className="size-3.5" />
            {L === "fr" ? "Place Coupe du Monde 2026" : "World Cup 2026 seat"}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr"
              ? "Un seul paiement, tout le tournoi."
              : "One payment, the whole tournament."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
            {L === "fr"
              ? `Pour ${formatMoney(status.amount_cents, status.settings.currency, moneyLocale)}, tu débloques les paris sur les 104 matchs. Pas d’abonnement, pas de relance, pas de mise minimale. Le top 3 du classement final se partage la cagnotte réelle.`
              : `For ${formatMoney(status.amount_cents, status.settings.currency, moneyLocale)} you unlock betting on all 104 matches. No subscription, no upsell, no minimum stake. The top 3 split the real-money pot at the end.`}
          </p>
        </div>
      </section>

      {stripe === "success" && (
        <div className="mb-6 flex items-start gap-3 rounded-[10px] border border-primary-500/35 bg-primary-500/[0.1] px-4 py-3 text-sm text-primary-200">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">
              {L === "fr" ? "Paiement reçu !" : "Payment received!"}
            </div>
            <div className="mt-0.5 text-text-secondary">
              {L === "fr"
                ? "Ton paiement est en cours de validation. L’accès aux paris s’ouvre dans quelques secondes — recharge la page si besoin."
                : "Your payment is being confirmed. Betting access opens within seconds — refresh the page if it lags."}
            </div>
          </div>
        </div>
      )}
      {stripe === "cancelled" && (
        <div className="mb-6 rounded-[10px] border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-text-secondary">
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

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        <Bullet
          icon={ShieldCheck}
          title={L === "fr" ? "Pas de mise par pari" : "No per-bet stake"}
          body={
            L === "fr"
              ? "Le buy-in est ta seule contribution. Les paris se jouent en points."
              : "The buy-in is your only contribution. Bets are scored in points."
          }
        />
        <Bullet
          icon={CalendarClock}
          title={L === "fr" ? "Modifie jusqu’au dernier moment" : "Edit till the last call"}
          body={
            L === "fr"
              ? "Tu peux changer un pronostic jusqu’à 1 h avant chaque coup d’envoi."
              : "Change a pick up to 1 h before each kickoff."
          }
        />
        <Bullet
          icon={Trophy}
          title={L === "fr" ? "Top 3 récolte la cagnotte" : "Top 3 share the pot"}
          body={
            L === "fr"
              ? "À la fin du tournoi, le podium se partage l’intégralité du pot."
              : "When the tournament ends, the podium splits the whole pot."
          }
        />
      </section>

      <p className="mt-6 text-center text-xs text-text-tertiary">
        {L === "fr" ? "Déjà joué ? " : "Already played? "}
        <Link
          href="/dashboard"
          className="font-semibold text-primary-400 hover:text-primary-300"
        >
          {L === "fr" ? "Aller au dashboard" : "Open dashboard"}
        </Link>
      </p>
    </main>
  );
}

function Bullet({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.6] p-4 backdrop-blur-xl">
      <div className="mb-2 flex size-9 items-center justify-center rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] text-gold-300">
        <Icon className="size-4" strokeWidth={1.7} />
      </div>
      <div className="font-display text-sm font-semibold text-text-primary">
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-text-secondary">{body}</p>
    </div>
  );
}
