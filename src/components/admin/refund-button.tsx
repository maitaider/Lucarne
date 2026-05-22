"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { refundPayment } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function RefundButton({
  paymentId,
  locale,
}: {
  paymentId: string;
  locale: Locale;
}) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleConfirm() {
    startTransition(async () => {
      const res = await refundPayment({
        payment_id: paymentId,
        reason: reason || undefined,
      });
      if (res.ok) {
        toast.success(
          locale === "fr" ? "Paiement remboursé." : "Payment refunded.",
        );
        setConfirming(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-tertiary transition hover:bg-error/10 hover:text-error"
      >
        <RotateCcw className="size-3" strokeWidth={2} />
        {locale === "fr" ? "Rembourser" : "Refund"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={locale === "fr" ? "Raison…" : "Reason…"}
        className="w-32 rounded-md border border-white/[0.1] bg-abyss/60 px-2 py-1 text-xs text-text-primary outline-none focus:border-error/50"
        autoFocus
      />
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition",
          isPending
            ? "bg-white/[0.06] text-text-tertiary"
            : "bg-error/20 text-error hover:bg-error/30",
        )}
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />
        ) : null}
        OK
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-md px-2 py-1 text-[11px] text-text-tertiary hover:text-text-primary"
      >
        ✕
      </button>
    </div>
  );
}
