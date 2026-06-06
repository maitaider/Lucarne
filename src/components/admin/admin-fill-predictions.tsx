"use client";

import { useState, useTransition } from "react";
import { fillRandomPredictions } from "@/lib/predictions/random-fill";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { Dices, Lock, AlertTriangle } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Admin op — after the global deadline, fill every paying player's EMPTY
 * predictions (group scores + bracket) with random valid picks. Idempotent.
 */
export function AdminFillPredictions({
  locale,
  deadlineLabel,
  deadlinePassed,
}: {
  locale: Locale;
  deadlineLabel: string;
  deadlinePassed: boolean;
}) {
  const fr = locale === "fr";
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function run() {
    const warn = deadlinePassed
      ? ""
      : fr
        ? "\n\n⚠️ L'échéance n'est PAS encore passée — les joueurs peuvent encore éditer leurs pronostics."
        : "\n\n⚠️ The deadline has NOT passed yet — players can still edit their predictions.";
    const ok = window.confirm(
      (fr
        ? "Remplir les cases VIDES de TOUS les payeurs avec des pronostics aléatoires ? Les pronostics déjà saisis sont conservés."
        : "Fill the EMPTY cells of ALL paying players with random predictions? Existing picks are kept.") + warn,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await fillRandomPredictions();
      if (res.ok) {
        setResult(res.message);
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <section className="rounded-md border border-violet-500/25 bg-violet-500/[0.05] p-4">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
        <Dices className="size-4 text-violet-300" strokeWidth={1.8} />
        {fr ? "Verrouiller & remplir les pronostics" : "Lock & fill predictions"}
      </h2>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
        <Lock className="size-3.5" strokeWidth={2} />
        {fr ? "Échéance : " : "Deadline: "}
        <span className="font-medium text-text-secondary">{deadlineLabel}</span>
        {" — "}
        {deadlinePassed
          ? fr
            ? "passée, pronostics verrouillés."
            : "passed, predictions locked."
          : fr
            ? "pas encore passée."
            : "not passed yet."}
      </p>
      <p className="mt-2 text-xs leading-5 text-text-secondary">
        {fr
          ? "Pour chaque payeur, complète les scores de poule et l'arbre encore vides par des choix aléatoires valides (les pronostics déjà saisis sont conservés). Action relançable sans risque."
          : "For each paying player, fills any empty group scores and bracket slots with random valid picks (existing picks are kept). Safe to re-run."}
      </p>

      {!deadlinePassed && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xs bg-amber-500/[0.1] px-2 py-1.5 text-[11px] text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
          {fr
            ? "À lancer normalement APRÈS l'échéance (sinon les joueurs peuvent encore éditer)."
            : "Normally run AFTER the deadline (players can still edit otherwise)."}
        </p>
      )}

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={cn(
          "mt-3 inline-flex items-center gap-2 rounded-md bg-violet-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Dices className="size-4" strokeWidth={2} />
        {pending
          ? fr
            ? "Remplissage…"
            : "Filling…"
          : fr
            ? "Remplir les pronostics des payeurs"
            : "Fill payers' predictions"}
      </button>

      {result && (
        <p className="mt-2 text-xs font-medium text-primary-300">{result}</p>
      )}
    </section>
  );
}
