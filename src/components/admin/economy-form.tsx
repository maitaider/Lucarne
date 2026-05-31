"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateAppSettings } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  Loader2,
  Save,
  Plus,
  Minus,
  Trophy,
  Calendar,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Props = {
  initial: {
    token_price_cents: number;
    buy_in_amount_cents: number;
    buy_in_deadline: string | null;
    prize_distribution: {
      shares: number[];
      house_rake_pct: number;
      description_fr: string;
      description_en: string;
    };
    contact_info: string | null;
    currency: string;
  };
  totalCollectedCents: number;
  locale: Locale;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  CAD: "$ CA",
  USD: "$ US",
  EUR: "€",
  GBP: "£",
};

export function EconomyForm({ initial, totalCollectedCents, locale }: Props) {
  const [currency, setCurrency] = useState(initial.currency || "CAD");
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const [buyInDollars, setBuyInDollars] = useState(
    (initial.buy_in_amount_cents / 100).toFixed(2),
  );
  const [deadlineLocal, setDeadlineLocal] = useState(
    initial.buy_in_deadline
      ? isoToLocal(initial.buy_in_deadline)
      : "",
  );
  const [shares, setShares] = useState<number[]>(
    initial.prize_distribution.shares ?? [50, 30, 20],
  );
  const [housePct, setHousePct] = useState(
    initial.prize_distribution.house_rake_pct ?? 0,
  );
  const [contactInfo, setContactInfo] = useState(initial.contact_info ?? "");

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const sumShares = shares.reduce((a, b) => a + b, 0);
  // Payout shares split the POOL (what remains after the rake), so they must
  // sum to 100 on their own. The rake (Stripe fees + hosting) is independent.
  const totalPct = sumShares;
  const isValid = sumShares === 100 && housePct >= 0 && housePct <= 100;

  // Live projection
  const projectedPool = Math.floor(
    (totalCollectedCents * (100 - housePct)) / 100,
  );
  const projectedPayouts = shares.map((s) =>
    Math.floor((projectedPool * s) / 100),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) {
      toast.error(
        locale === "fr"
          ? `Les parts (${totalPct}%) doivent totaliser 100%.`
          : `Shares (${totalPct}%) must total 100%.`,
      );
      return;
    }
    startTransition(async () => {
      const res = await updateAppSettings({
        buy_in_amount_cents: Math.round(Number(buyInDollars) * 100),
        currency,
        buy_in_deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : null,
        prize_distribution: {
          shares,
          house_rake_pct: housePct,
          description_fr: buildDescription(shares, housePct, "fr"),
          description_en: buildDescription(shares, housePct, "en"),
        },
        contact_info: contactInfo || null,
      });
      if (res.ok) {
        toast.success(
          locale === "fr" ? "Réglages sauvegardés." : "Settings saved.",
        );
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Access price (buy-in) + currency */}
      <Card
        icon={Coins}
        title={locale === "fr" ? "Prix d'accès" : "Access price"}
        body={
          locale === "fr"
            ? "Montant unique payé par Stripe pour accéder à l'app et participer (ex. 20 $ CA)."
            : "One-time amount paid via Stripe to access the app and join (e.g. CA$20)."
        }
      >
        <div className="grid grid-cols-[1fr_7rem] items-center gap-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              type="number"
              min={1}
              max={10000}
              step={0.01}
              value={buyInDollars}
              onChange={(e) => setBuyInDollars(e.target.value)}
              className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-lg tabular-nums text-text-primary outline-none transition focus:border-primary-500/50"
            />
            <span className="font-display text-base text-text-tertiary">{symbol}</span>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-2 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500/50"
            aria-label={locale === "fr" ? "Devise" : "Currency"}
          >
            {["CAD", "USD", "EUR", "GBP"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[11px] text-text-tertiary">
          {locale === "fr"
            ? `Modifie le montant débité au checkout Stripe et affiché sur la page d'accès.`
            : `Changes the amount charged at Stripe checkout and shown on the access page.`}
        </p>
      </Card>

      {/* Deadline */}
      <Card
        icon={Calendar}
        title={locale === "fr" ? "Date butoir d'achat" : "Buy-in deadline"}
        body={
          locale === "fr"
            ? "Au-delà de cette date, les joueurs ne peuvent plus régler leur accès."
            : "After this date, players can no longer pay for access."
        }
      >
        <input
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => setDeadlineLocal(e.target.value)}
          className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500/50"
        />
        <button
          type="button"
          onClick={() => setDeadlineLocal("")}
          className="mt-2 text-[11px] text-text-tertiary hover:text-text-primary"
        >
          {locale === "fr" ? "Effacer la deadline" : "Clear deadline"}
        </button>
      </Card>

      {/* Prize distribution */}
      <Card
        icon={Trophy}
        title={locale === "fr" ? "Répartition de la cagnotte" : "Prize distribution"}
        body={
          locale === "fr"
            ? `Définis la part de chaque place. Les parts se partagent la cagnotte (après commission) et doivent totaliser 100%. Actuel : ${totalPct}%`
            : `Set each placement's share. Shares split the pool (after rake) and must total 100%. Current: ${totalPct}%`
        }
      >
        <ul className="space-y-2">
          {shares.map((value, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md font-display text-sm font-bold ring-1",
                  idx === 0
                    ? "bg-gold-500/15 text-gold-300 ring-gold-500/30"
                    : idx === 1
                      ? "bg-text-secondary/15 text-text-primary ring-text-secondary/20"
                      : idx === 2
                        ? "bg-amber-700/15 text-amber-300 ring-amber-700/30"
                        : "bg-white/[0.05] text-text-secondary ring-white/[0.1]",
                )}
              >
                {idx + 1}
              </span>
              <span className="text-xs text-text-secondary">
                {idx === 0
                  ? locale === "fr"
                    ? "Champion"
                    : "Champion"
                  : idx === 1
                    ? locale === "fr"
                      ? "Finaliste"
                      : "Runner-up"
                    : idx === 2
                      ? locale === "fr"
                        ? "3ᵉ place"
                        : "3rd place"
                      : `${idx + 1}ᵉ`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => {
                    const next = [...shares];
                    next[idx] = Math.max(0, Math.min(100, Number(e.target.value)));
                    setShares(next);
                  }}
                  className="w-16 rounded-md border border-white/[0.1] bg-abyss/[0.6] px-2 py-1 text-right text-sm tabular-nums text-text-primary outline-none focus:border-primary-500/50"
                />
                <span className="text-sm text-text-tertiary">%</span>
                <span className="font-display text-sm font-bold tabular-nums text-primary-300">
                  {projectedPayouts[idx] != null
                    ? new Intl.NumberFormat(
                        locale === "fr" ? "fr-FR" : "en-US",
                        { style: "currency", currency },
                      ).format(projectedPayouts[idx]! / 100)
                    : "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShares(shares.filter((_, i) => i !== idx))}
                aria-label="Remove"
                className="text-text-tertiary hover:text-error"
              >
                <Minus className="size-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShares([...shares, 0])}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-text-secondary transition hover:border-primary-500/30 hover:text-primary-300"
        >
          <Plus className="size-3" strokeWidth={2.5} />
          {locale === "fr" ? "Ajouter une place" : "Add a placement"}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-sm border border-white/[0.08] bg-white/[0.03] p-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {locale === "fr" ? "Commission maison" : "House rake"}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={housePct}
                onChange={(e) => setHousePct(Number(e.target.value))}
                className="w-20 rounded-md border border-white/[0.1] bg-abyss/[0.6] px-2 py-1 text-right text-sm tabular-nums text-text-primary outline-none focus:border-primary-500/50"
              />
              <span className="text-xs text-text-tertiary">%</span>
            </div>
          </label>
          <div className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {locale === "fr" ? "Total" : "Total"}
            </span>
            <p
              className={cn(
                "mt-1 font-display text-xl font-bold tabular-nums",
                isValid ? "text-primary-300" : "text-error",
              )}
            >
              {totalPct}%
            </p>
          </div>
        </div>
      </Card>

      {/* Contact info */}
      <Card
        icon={Calendar}
        title={locale === "fr" ? "Coordonnées de paiement" : "Payment contact"}
        body={
          locale === "fr"
            ? "Visible par les joueurs (IBAN, PayPal, lien Lydia, etc.). Affiché dans la page Comment ça marche."
            : "Visible to players (IBAN, PayPal, Lydia link, etc.). Shown on the How it works page."
        }
      >
        <textarea
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={
            locale === "fr"
              ? "IBAN: FR76… · PayPal: paypal.me/lucarne · Lydia: @lucarne"
              : "IBAN: FR76… · PayPal: paypal.me/lucarne"
          }
          className="w-full resize-none rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50"
        />
      </Card>

      {/* Submit */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-md border border-white/[0.1] bg-abyss/95 p-3 shadow-2xl backdrop-blur-xl">
        <p className="text-xs text-text-secondary">
          {isValid
            ? locale === "fr"
              ? "Tout est OK, prêt à sauvegarder."
              : "All good, ready to save."
            : locale === "fr"
              ? `Total ${totalPct}% — doit être 100%`
              : `Total ${totalPct}% — must be 100%`}
        </p>
        <button
          type="submit"
          disabled={isPending || !isValid}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-4 py-2.5 text-sm font-bold transition",
            !isValid || isPending
              ? "bg-white/[0.06] text-text-tertiary"
              : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
          ) : (
            <Save className="size-4" strokeWidth={2.5} />
          )}
          {locale === "fr" ? "Sauvegarder" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-500/[0.12] text-gold-300 ring-1 ring-gold-500/30">
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-text-primary">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">{body}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function buildDescription(
  shares: number[],
  housePct: number,
  locale: Locale,
): string {
  const parts: string[] = [];
  shares.forEach((s, i) => {
    const label =
      i === 0
        ? locale === "fr"
          ? "champion"
          : "champion"
        : i === 1
          ? locale === "fr"
            ? "2ᵉ"
            : "2nd"
          : i === 2
            ? locale === "fr"
              ? "3ᵉ"
              : "3rd"
            : locale === "fr"
              ? `${i + 1}ᵉ`
              : `${i + 1}th`;
    parts.push(`${s}% au ${label}`);
  });
  if (housePct > 0) {
    parts.push(
      locale === "fr"
        ? `${housePct}% commission`
        : `${housePct}% house`,
    );
  }
  return parts.join(" · ");
}
