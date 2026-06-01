"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { recordPayment } from "@/lib/admin/actions";
import { PAYMENT_METHODS } from "@/lib/admin/constants";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type UserOption = {
  id: string;
  username: string;
  display_name: string | null;
  paid?: boolean;
};

const CURRENCY_SYMBOL: Record<string, string> = {
  CAD: "$ CA",
  USD: "$ US",
  EUR: "€",
  GBP: "£",
};

const METHOD_LABELS: Record<
  (typeof PAYMENT_METHODS)[number],
  { fr: string; en: string }
> = {
  cash: { fr: "Espèces", en: "Cash" },
  transfer: { fr: "Virement", en: "Bank transfer" },
  paypal: { fr: "PayPal", en: "PayPal" },
  revolut: { fr: "Revolut", en: "Revolut" },
  lydia: { fr: "Lydia", en: "Lydia" },
  wise: { fr: "Wise", en: "Wise" },
  other: { fr: "Autre", en: "Other" },
};

export function RecordPaymentForm({
  users,
  currency,
  locale,
}: {
  users: UserOption[];
  currency: string;
  locale: Locale;
}) {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [amountStr, setAmountStr] = useState("20");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const amountCents = Math.round(Number(amountStr || 0) * 100);
  const selectedPaid = users.find((u) => u.id === userId)?.paid ?? false;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) {
      toast.error(
        locale === "fr" ? "Choisis un joueur." : "Pick a player.",
      );
      return;
    }
    if (amountCents <= 0) {
      toast.error(locale === "fr" ? "Montant invalide." : "Invalid amount.");
      return;
    }
    startTransition(async () => {
      const res = await recordPayment({
        user_id: userId,
        amount_cents: amountCents,
        method,
        currency,
        reference: reference || undefined,
        note: note || undefined,
        allow_duplicate: allowDuplicate,
      });
      if (res.ok) {
        toast.success(
          locale === "fr"
            ? "Paiement enregistré — accès débloqué."
            : "Payment recorded — access unlocked.",
        );
        setOpen(false);
        setUserId("");
        setAmountStr("20");
        setReference("");
        setNote("");
        setAllowDuplicate(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        {locale === "fr" ? "Nouveau paiement" : "New payment"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl">
              <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {locale === "fr" ? "Nouveau paiement" : "New payment"}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={locale === "fr" ? "Fermer" : "Close"}
                  className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-white/[0.08] hover:text-text-primary"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </header>
              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <Field
                  label={locale === "fr" ? "Joueur" : "Player"}
                  required
                >
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500/50"
                    required
                  >
                    <option value="">
                      {locale === "fr" ? "Sélectionner…" : "Select…"}
                    </option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.paid ? "✓ " : ""}
                        {u.display_name ?? u.username} (@{u.username})
                        {u.paid
                          ? locale === "fr"
                            ? " — déjà payé"
                            : " — already paid"
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label={
                      locale === "fr"
                        ? `Montant (${symbol})`
                        : `Amount (${symbol})`
                    }
                    required
                  >
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm tabular-nums text-text-primary outline-none transition focus:border-primary-500/50"
                      required
                    />
                  </Field>
                  <Field
                    label={locale === "fr" ? "Méthode" : "Method"}
                    required
                  >
                    <select
                      value={method}
                      onChange={(e) =>
                        setMethod(
                          e.target.value as (typeof PAYMENT_METHODS)[number],
                        )
                      }
                      className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-primary-500/50"
                      required
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {METHOD_LABELS[m][locale]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field
                  label={
                    locale === "fr"
                      ? "Référence (optionnel)"
                      : "Reference (optional)"
                  }
                  hint={
                    locale === "fr"
                      ? "Numéro virement, ID PayPal, etc."
                      : "Transfer ID, PayPal txn, etc."
                  }
                >
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={120}
                    placeholder="REF-…"
                    className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50"
                  />
                </Field>

                <Field
                  label={locale === "fr" ? "Note (optionnel)" : "Note (optional)"}
                >
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder={
                      locale === "fr"
                        ? "Contexte du paiement…"
                        : "Payment context…"
                    }
                    className="w-full resize-none rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50"
                  />
                </Field>

                {selectedPaid && (
                  <label className="flex items-start gap-2.5 rounded-sm border border-gold-500/30 bg-gold-500/[0.08] px-4 py-3 text-xs leading-5 text-text-secondary">
                    <input
                      type="checkbox"
                      checked={allowDuplicate}
                      onChange={(e) => setAllowDuplicate(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-gold-500"
                    />
                    <span>
                      {locale === "fr"
                        ? "Ce joueur a déjà un accès payé. Coche pour forcer un 2ᵉ paiement (rare — ça gonfle la cagnotte)."
                        : "This player already has a paid seat. Check to force a 2nd payment (rare — it inflates the pot)."}
                    </span>
                  </label>
                )}

                <div className="rounded-sm border border-primary-500/25 bg-primary-500/[0.08] px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {locale === "fr" ? "Montant enregistré" : "Recorded amount"}
                    </span>
                    <span className="font-display text-xl font-bold tabular-nums text-primary-300">
                      {(amountCents / 100).toLocaleString(
                        locale === "fr" ? "fr-FR" : "en-US",
                        { style: "currency", currency },
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-text-tertiary">
                    {locale === "fr"
                      ? "Débloque l'accès du joueur. Aucun jeton — les pronostics sont gratuits et comptés en points."
                      : "Unlocks the player's access. No tokens — predictions are free and scored in points."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !userId ||
                    amountCents <= 0 ||
                    (selectedPaid && !allowDuplicate)
                  }
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 text-sm font-bold transition",
                    isPending ||
                      !userId ||
                      amountCents <= 0 ||
                      (selectedPaid && !allowDuplicate)
                      ? "bg-white/[0.06] text-text-tertiary"
                      : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
                  )}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Plus className="size-4" strokeWidth={2.5} />
                  )}
                  {locale === "fr"
                    ? "Enregistrer le paiement"
                    : "Record payment"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-tertiary">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[10px] text-text-tertiary">{hint}</span>
      )}
    </label>
  );
}
