import { getLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { MatchResultsAdmin } from "@/components/admin/match-results-admin";
import { Goal } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function AdminMatchesPage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const matches = await listMatches();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
          <Goal className="size-5" strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {fr ? "Résultats des matchs" : "Match results"}
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm text-text-tertiary">
            {fr
              ? "Saisis le score de chaque match. Passe le statut à « Terminé » pour régler automatiquement les pronostics. Corriger un match déjà terminé recalcule les points pour tout le monde."
              : "Enter each match's score. Set the status to “Finished” to settle predictions automatically. Correcting an already-finished match recomputes everyone's points."}
          </p>
        </div>
      </div>

      <MatchResultsAdmin matches={matches} locale={locale} />
    </div>
  );
}
