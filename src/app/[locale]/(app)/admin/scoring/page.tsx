import { setRequestLocale } from "next-intl/server";
import { Calculator } from "lucide-react";
import { getAppSettings } from "@/lib/admin/economy";
import { ScoringForm } from "@/components/admin/scoring-form";
import type { Locale } from "@/i18n/routing";

export default async function AdminScoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const settings = await getAppSettings();
  const rules = settings.scoring_rules ?? {};

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-300">
          <Calculator className="size-3.5" strokeWidth={2} />
          {fr ? "Barème" : "Scoring"}
        </div>
        <h1 className="font-display text-2xl font-semibold text-text-primary sm:text-3xl">
          {fr ? "Barème de points" : "Points scoring"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
          {fr
            ? "Règle combien rapporte chaque composante d'un pronostic de score. Modifiable à tout moment — la page « Comment ça marche » reflète automatiquement ces valeurs."
            : "Set how many points each part of a score prediction is worth. Editable any time — the “How it works” page reflects these values automatically."}
        </p>
      </header>

      <ScoringForm
        initial={{
          match_winner: Number(rules.match_winner ?? 5),
          total_goals_exact: Number(rules.total_goals_exact ?? 2),
          total_goals_close: Number(rules.total_goals_close ?? 1),
          exact_score: Number(rules.exact_score ?? 5),
        }}
        locale={L}
      />
    </div>
  );
}
