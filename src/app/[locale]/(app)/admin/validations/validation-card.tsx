"use client";

import { useState, useTransition } from "react";
import {
  markPaymentReceived,
  validateBet,
  rejectBet,
} from "@/lib/admin/actions";
import type { ValidationQueueItem } from "@/lib/admin/queries";
import { Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en";

export function ValidationCard({
  item,
  locale,
}: {
  item: ValidationQueueItem;
  locale: Locale;
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null,
  );
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const isPaid = item.bet_status === "paid";
  const stakeEuros = item.stake_cents / 100;

  function onMarkPaid() {
    startTransition(async () => {
      const res = await markPaymentReceived({
        bet_id: item.bet_id,
        amount_cents: item.stake_cents,
        payment_method: paymentMethod,
      });
      setFeedback(
        res.ok
          ? { kind: "ok", msg: locale === "fr" ? "Paiement enregistré." : "Payment recorded." }
          : { kind: "err", msg: res.message ?? "Erreur" },
      );
    });
  }

  function onValidate() {
    startTransition(async () => {
      const res = await validateBet(item.bet_id);
      setFeedback(
        res.ok
          ? { kind: "ok", msg: locale === "fr" ? "Pari validé." : "Bet validated." }
          : { kind: "err", msg: res.message ?? "Erreur" },
      );
    });
  }

  function onReject() {
    if (reason.trim().length < 10) {
      setFeedback({
        kind: "err",
        msg: locale === "fr" ? "Raison min. 10 caractères." : "Reason min 10 chars.",
      });
      return;
    }
    startTransition(async () => {
      const res = await rejectBet(item.bet_id, reason);
      setFeedback(
        res.ok
          ? { kind: "ok", msg: locale === "fr" ? "Pari rejeté." : "Bet rejected." }
          : { kind: "err", msg: res.message ?? "Erreur" },
      );
    });
  }

  return (
    <article className="overflow-hidden rounded-[8px] border border-white/[0.08] bg-surface-1/[0.72] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-surface-3 px-2 py-0.5 font-semibold uppercase tracking-wider text-text-secondary">
              {item.bet_type}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-bold uppercase tracking-wider",
                isPaid
                  ? "bg-gold-500/15 text-gold-400"
                  : "bg-warning/15 text-warning",
              )}
            >
              {isPaid
                ? locale === "fr"
                  ? "Payé"
                  : "Paid"
                : locale === "fr"
                  ? "En attente"
                  : "Awaiting"}
            </span>
          </div>
          <div className="font-display text-base font-semibold text-text-primary">
            @{item.username}
            {item.display_name && (
              <span className="ml-2 text-sm font-normal text-text-tertiary">
                ({item.display_name})
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-text-tertiary">
            {locale === "fr" ? "Mise" : "Stake"}:{" "}
            <span className="font-mono tabular-nums text-text-primary">
              {item.stake_cents} jetons
            </span>{" "}
            ≈ {stakeEuros.toFixed(2)} €
          </div>
          <pre className="mt-2 max-h-24 overflow-auto rounded-md bg-surface-3 p-2 font-mono text-xs text-text-secondary">
            {JSON.stringify(item.payload, null, 2)}
          </pre>
          {item.kickoff_at && (
            <div className="mt-2 text-xs text-text-tertiary">
              ⏱ {new Date(item.kickoff_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[180px]">
          {!isPaid ? (
            <>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-white/[0.1] bg-abyss/[0.48] px-2 py-1.5 text-xs text-text-primary"
              >
                <option value="cash">Cash</option>
                <option value="revolut">Revolut</option>
                <option value="lydia">Lydia</option>
                <option value="paypal_friends">PayPal Friends</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={onMarkPaid}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold-500/20 px-3 py-1.5 text-xs font-semibold text-gold-400 transition hover:bg-gold-500/30 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3 animate-spin" />}
                {locale === "fr" ? "Marquer payé" : "Mark paid"}
              </button>
            </>
          ) : (
            <button
              onClick={onValidate}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-xs font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3" />
              )}
              {locale === "fr" ? "Valider" : "Validate"}
            </button>
          )}

          {!rejecting ? (
            <button
              onClick={() => setRejecting(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/20"
            >
              <X className="size-3" />
              {locale === "fr" ? "Rejeter" : "Reject"}
            </button>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={locale === "fr" ? "Raison (min 10 car.)" : "Reason (min 10 chars)"}
                className="w-full resize-none rounded-md border border-white/[0.1] bg-abyss/[0.48] px-2 py-1.5 text-xs text-text-primary"
                rows={2}
              />
              <div className="flex gap-1">
                <button
                  onClick={onReject}
                  disabled={isPending}
                  className="flex-1 rounded-md bg-error/20 px-2 py-1 text-[10px] font-semibold text-error"
                >
                  {locale === "fr" ? "Confirmer" : "Confirm"}
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="rounded-[6px] border border-white/[0.1] px-2 py-1 text-[10px] text-text-tertiary"
                >
                  {locale === "fr" ? "Annuler" : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-1.5 border-t px-5 py-2 text-xs",
            feedback.kind === "ok"
              ? "border-primary-500/20 bg-primary-500/5 text-primary-400"
              : "border-error/20 bg-error/5 text-error",
          )}
        >
          {feedback.kind === "err" && <AlertCircle className="size-3" />}
          {feedback.msg}
        </div>
      )}
    </article>
  );
}
