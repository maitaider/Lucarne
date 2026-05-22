"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Coins, CreditCard, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Pack = "small" | "medium" | "large";

const PACKS: { key: Pack; tokens: number; tag?: { fr: string; en: string } }[] = [
  { key: "small", tokens: 20 },
  {
    key: "medium",
    tokens: 50,
    tag: { fr: "Populaire", en: "Popular" },
  },
  { key: "large", tokens: 200 },
];

export function BuyTokensCard({
  tokenPriceCents,
  currency,
  stripeReady,
  locale,
}: {
  tokenPriceCents: number;
  currency: string;
  stripeReady: boolean;
  locale: Locale;
}) {
  const [selected, setSelected] = useState<Pack>("medium");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function handleBuy() {
    if (!stripeReady) {
      toast.error(
        locale === "fr"
          ? "Stripe n'est pas encore activé. Demande à l'admin."
          : "Stripe is not enabled yet. Ask the admin.",
      );
      return;
    }
    startTransition(async () => {
      const res = await createCheckoutSession({ pack: selected, locale });
      if (res.ok) {
        window.location.href = res.url;
      } else {
        toast.error(res.message);
      }
    });
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);

  return (
    <section className="rounded-[14px] border border-gold-500/30 bg-gradient-to-br from-gold-500/[0.1] via-primary-500/[0.04] to-transparent p-5 backdrop-blur-xl sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gold-500/[0.15] text-gold-300 ring-1 ring-gold-500/30">
          <Sparkles className="size-5" strokeWidth={1.7} />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? "Acheter des jetons" : "Buy tokens"}
          </h2>
          <p className="text-xs text-text-tertiary">
            {locale === "fr"
              ? `${fmt(tokenPriceCents)} par jeton · paiement sécurisé par Stripe`
              : `${fmt(tokenPriceCents)} per token · secure Stripe checkout`}
          </p>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {PACKS.map((p) => {
          const isActive = selected === p.key;
          const amount = p.tokens * tokenPriceCents;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              className={cn(
                "relative rounded-[10px] border p-3 text-left transition",
                isActive
                  ? "border-gold-500/50 bg-gold-500/[0.12] shadow-glow-gold"
                  : "border-white/[0.08] bg-white/[0.04] hover:border-gold-500/30 hover:bg-white/[0.06]",
              )}
            >
              {p.tag && (
                <span className="absolute -top-2 right-2 rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-abyss">
                  {p.tag[locale]}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Coins
                  className={cn(
                    "size-3.5",
                    isActive ? "text-gold-300" : "text-text-tertiary",
                  )}
                  strokeWidth={2}
                />
                <span
                  className={cn(
                    "font-display text-xl font-bold tabular-nums",
                    isActive ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {p.tokens}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                {locale === "fr" ? "jetons" : "tokens"}
              </div>
              <div className="mt-2 font-display text-sm font-semibold tabular-nums text-gold-300">
                {fmt(amount)}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={isPending}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-3 text-sm font-bold transition",
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
          ? `Payer avec Stripe · ${fmt(PACKS.find((p) => p.key === selected)!.tokens * tokenPriceCents)}`
          : `Pay with Stripe · ${fmt(PACKS.find((p) => p.key === selected)!.tokens * tokenPriceCents)}`}
      </button>

      {!stripeReady && (
        <p className="mt-2 text-center text-[10px] text-text-tertiary">
          {locale === "fr"
            ? "Stripe pas encore activé · l'admin doit configurer STRIPE_SECRET_KEY."
            : "Stripe not enabled yet · admin needs to set STRIPE_SECRET_KEY."}
        </p>
      )}
    </section>
  );
}
