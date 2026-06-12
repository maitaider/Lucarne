"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function BuyInCard({
  amountCents,
  currency,
  stripeReady,
  alreadyPaid,
  deadlinePassed,
  canBuyIn = false,
  deadlineAt,
  locale,
  compact = false,
}: {
  amountCents: number;
  currency: string;
  stripeReady: boolean;
  alreadyPaid: boolean;
  deadlinePassed: boolean;
  /** Late entry: checkout stays open even after the global deadline. */
  canBuyIn?: boolean;
  deadlineAt: string;
  locale: Locale;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const fmt = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);

  function handleBuy() {
    if (!stripeReady) {
      toast.error(
        locale === "fr"
          ? "Stripe n'est pas encore activé. Demande à l'admin."
          : "Stripe is not enabled yet. Ask the admin.",
      );
      return;
    }
    if (alreadyPaid) return;
    startTransition(async () => {
      const res = await createCheckoutSession({ locale });
      if (res.ok) {
        window.location.href = res.url;
      } else {
        toast.error(res.message);
      }
    });
  }

  const deadlineLabel = new Date(deadlineAt).toLocaleString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { dateStyle: "long", timeStyle: "short" },
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-gold-500/35 bg-gradient-to-br from-gold-500/[0.14] via-primary-500/[0.05] to-transparent backdrop-blur-xl",
        compact ? "p-4 sm:p-5" : "p-6 sm:p-7",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gold-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-12 items-center justify-center rounded-[10px] border border-gold-500/40 bg-gold-500/15 text-gold-300 shadow-glow-gold">
            <Ticket className="size-6" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
              {alreadyPaid
                ? locale === "fr"
                  ? "Place acquise"
                  : "Seat secured"
                : locale === "fr"
                  ? "Achat unique"
                  : "One-time entry"}
            </p>
            <h2
              className={cn(
                "font-display font-bold tracking-tight text-text-primary",
                compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
              )}
            >
              {locale === "fr"
                ? "Ton accès Coupe du Monde 2026"
                : "Your World Cup 2026 access"}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-text-secondary">
              {alreadyPaid
                ? locale === "fr"
                  ? "Ton accès est actif : tous les matchs, scores en direct, news et analyses — et le concours de pronos entre amis."
                  : "Your access is active: every match, live scores, news and analysis — plus the friends' prediction game."
                : locale === "fr"
                  ? "Un paiement unique pour accéder à toute la Coupe du Monde 2026 sur Lucarne : les 104 matchs, scores en direct, news et analyses — et le concours de pronostics privé entre amis. Pas de frais cachés, pas de relance."
                  : "A one-time payment for full World Cup 2026 access on Lucarne: all 104 matches, live scores, news and analysis — plus the private friends' prediction game. No hidden fees, no upsell."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:w-[260px]">
          <div className="rounded-[10px] border border-gold-500/30 bg-abyss/40 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="font-display text-3xl font-extrabold tabular-nums text-gold-300 sm:text-4xl">
              {fmt(amountCents)}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {locale === "fr" ? "paiement unique" : "one-time payment"}
            </div>
          </div>

          {alreadyPaid ? (
            <div className="inline-flex items-center justify-center gap-2 rounded-sm border border-primary-500/35 bg-primary-500/15 px-4 py-3 text-sm font-bold text-primary-300">
              <CheckCircle2 className="size-4" strokeWidth={2.5} />
              {locale === "fr" ? "Accès activé" : "Access active"}
            </div>
          ) : deadlinePassed && !canBuyIn ? (
            <div className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm font-semibold text-text-tertiary">
              {locale === "fr"
                ? "Vente de places terminée"
                : "Seat sales closed"}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleBuy}
              disabled={isPending}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-bold transition",
                stripeReady && !isPending
                  ? "bg-gold-500 text-abyss shadow-glow-gold hover:bg-gold-400"
                  : "bg-white/[0.06] text-text-tertiary",
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : (
                <CreditCard className="size-4" strokeWidth={2.5} />
              )}
              {locale === "fr"
                ? `Débloquer l'accès · ${fmt(amountCents)}`
                : `Unlock access · ${fmt(amountCents)}`}
            </button>
          )}
        </div>
      </div>

      <ul className="relative mt-5 grid grid-cols-1 gap-2 text-xs text-text-secondary sm:grid-cols-3">
        <Feature
          icon={ShieldCheck}
          fr="Paiement sécurisé Stripe"
          en="Secure Stripe checkout"
          locale={locale}
        />
        <Feature
          icon={Ticket}
          fr={`Date butoire · ${deadlineLabel}`}
          en={`Deadline · ${deadlineLabel}`}
          locale={locale}
        />
        <Feature
          icon={CheckCircle2}
          fr="Modifie tes pronos jusqu’à 1 h avant chaque match"
          en="Edit picks up to 1 h before each match"
          locale={locale}
        />
      </ul>

      {!stripeReady && !alreadyPaid && (
        <p className="relative mt-3 text-center text-[10px] text-text-tertiary">
          {locale === "fr"
            ? "Stripe pas encore activé · l'admin doit configurer STRIPE_SECRET_KEY."
            : "Stripe not enabled yet · admin needs to set STRIPE_SECRET_KEY."}
        </p>
      )}
    </section>
  );
}

function Feature({
  icon: Icon,
  fr,
  en,
  locale,
}: {
  icon: typeof ShieldCheck;
  fr: string;
  en: string;
  locale: Locale;
}) {
  return (
    <li className="flex items-start gap-2 rounded-sm border border-white/[0.06] bg-white/[0.025] px-3 py-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-gold-300" strokeWidth={1.7} />
      <span className="leading-5">{locale === "fr" ? fr : en}</span>
    </li>
  );
}
