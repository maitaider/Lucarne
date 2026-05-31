"use client";

import { useTransition } from "react";
import { resolveSupportTicket } from "@/lib/support/actions";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Check, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function SupportResolveButton({
  ticketId,
  locale,
}: {
  ticketId: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [isPending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const res = await resolveSupportTicket(ticketId);
          if (res.ok) {
            toast.success(fr ? "Marqué résolu." : "Marked resolved.");
            router.refresh();
          } else {
            toast.error(res.error ?? "Erreur");
          }
        })
      }
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border border-primary-500/35 bg-primary-500/10 px-2.5 py-1.5 text-xs font-semibold text-primary-300 transition hover:bg-primary-500/20 disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Check className="size-3.5" />
      )}
      {fr ? "Résoudre" : "Resolve"}
    </button>
  );
}
