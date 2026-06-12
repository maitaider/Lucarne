"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { setLateEntryOpen } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import { DoorOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function LateEntryToggle({
  initialOpen,
  locale,
}: {
  initialOpen: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function toggle() {
    const next = !open;
    setOpen(next); // optimistic
    startTransition(async () => {
      const res = await setLateEntryOpen(next);
      if (res.ok) {
        toast.success(
          next
            ? fr
              ? "Entrées tardives ouvertes"
              : "Late entry opened"
            : fr
              ? "Entrées tardives fermées"
              : "Late entry closed",
        );
        router.refresh();
      } else {
        setOpen(!next); // revert
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  return (
    <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-500/[0.12] text-gold-300 ring-1 ring-gold-500/30">
            <DoorOpen className="size-4" strokeWidth={1.7} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-text-primary">
              {fr ? "Entrées tardives" : "Late entry"}
            </h3>
            <p className="mt-0.5 max-w-lg text-xs leading-5 text-text-secondary">
              {fr
                ? "Une fois le tournoi commencé : autorise de nouveaux joueurs à acheter leur place. Chacun a alors 1 h après son paiement pour pronostiquer les matchs à venir (les matchs déjà joués comptent 0 pt). Les joueurs déjà inscrits restent verrouillés."
                : "After the tournament starts: let new players buy in. Each then has 1 h after payment to predict upcoming matches (already-played matches score 0). Existing players stay locked."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-pressed={open}
          aria-label={fr ? "Basculer les entrées tardives" : "Toggle late entry"}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition",
            open ? "bg-primary-500" : "bg-white/[0.14]",
          )}
        >
          {isPending ? (
            <Loader2 className="mx-auto size-4 animate-spin text-white" strokeWidth={2} />
          ) : (
            <span
              className={cn(
                "size-6 rounded-full bg-white shadow transition",
                open && "translate-x-5",
              )}
            />
          )}
        </button>
      </div>
      <p
        className={cn(
          "mt-3 text-[11px] font-bold uppercase tracking-wider",
          open ? "text-primary-300" : "text-text-tertiary",
        )}
      >
        {open
          ? fr
            ? "● Ouvert — les non-payeurs voient « Acheter ma place »"
            : "● Open — unpaid players see “Buy your seat”"
          : fr
            ? "○ Fermé"
            : "○ Closed"}
      </p>
    </section>
  );
}
