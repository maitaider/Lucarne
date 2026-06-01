"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { deletePayment } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Permanently delete a payment row (fix a mistake, clear test money, or a
 * cash-refunded payment). Two-step confirm. Removing a confirmed payment
 * revokes that player's access.
 */
export function DeletePaymentButton({
  paymentId,
  locale,
}: {
  paymentId: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleDelete() {
    startTransition(async () => {
      const res = await deletePayment({ payment_id: paymentId });
      if (res.ok) {
        toast.success(fr ? "Paiement supprimé." : "Payment deleted.");
        setConfirming(false);
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
        <Trash2 className="size-3" strokeWidth={2} />
        {fr ? "Supprimer" : "Delete"}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10px] text-text-tertiary">{fr ? "Sûr ?" : "Sure?"}</span>
      <button
        type="button"
        onClick={handleDelete}
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
        {fr ? "Oui" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        aria-label={fr ? "Annuler" : "Cancel"}
        className="rounded-md px-2 py-1 text-[11px] text-text-tertiary hover:text-text-primary"
      >
        ✕
      </button>
    </div>
  );
}
