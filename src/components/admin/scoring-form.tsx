"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { updateScoringRules, recomputeAllScores } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  Calculator,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Save,
  Target,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Rules = {
  match_winner: number;
  total_goals_exact: number;
  total_goals_close: number;
  exact_score: number;
};

export function ScoringForm({
  initial,
  locale,
}: {
  initial: Rules;
  locale: "fr" | "en";
}) {
  const fr = locale === "fr";
  const router = useRouter();
  const toast = useToast();
  const [r, setR] = useState<Rules>(initial);
  const [savePending, startSave] = useTransition();
  const [rescorePending, startRescore] = useTransition();

  const set = (k: keyof Rules) => (v: number) =>
    setR((prev) => ({ ...prev, [k]: Number.isFinite(v) ? v : 0 }));

  const maxPerMatch = r.match_winner + r.total_goals_exact + r.exact_score;

  function onSave() {
    startSave(async () => {
      const res = await updateScoringRules(r);
      if (!res.ok) {
        toast.error(res.message ?? (fr ? "Erreur" : "Error"));
        return;
      }
      toast.success(
        fr
          ? "Barème enregistré — appliqué aux prochains matchs."
          : "Scoring saved — applies to upcoming matches.",
      );
      router.refresh();
    });
  }

  function onRescore() {
    const ok = window.confirm(
      fr
        ? "Re-scorer tous les matchs DÉJÀ joués avec ce barème ? Le classement va changer. (Aucune notification ne sera envoyée.)"
        : "Re-score all ALREADY-played matches with this barème? Standings will change. (No notifications are sent.)",
    );
    if (!ok) return;
    startRescore(async () => {
      const res = await recomputeAllScores();
      if (!res.ok) {
        toast.error(res.message ?? (fr ? "Erreur" : "Error"));
        return;
      }
      toast.success(
        fr
          ? `${res.count ?? 0} pronostics re-scorés.`
          : `${res.count ?? 0} predictions re-scored.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Match scoring */}
      <section className="rounded-md border border-white/[0.08] bg-surface-1/[0.55] p-5 backdrop-blur-xl">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <Calculator className="size-4 text-gold-400" strokeWidth={1.8} />
          {fr ? "Barème par match" : "Per-match scoring"}
        </h2>
        <p className="mb-4 text-xs text-text-tertiary">
          {fr
            ? "Un pronostic de score cumule ces points. Mets une valeur à 0 pour désactiver une composante."
            : "A score prediction stacks these points. Set a value to 0 to disable a component."}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PointField
            icon={MousePointerClick}
            label={fr ? "Bon vainqueur (1X2)" : "Right winner (1X2)"}
            hint={fr ? "issue correcte" : "correct outcome"}
            value={r.match_winner}
            onChange={set("match_winner")}
            accent="text-primary-300"
          />
          <PointField
            icon={Zap}
            label={fr ? "Score exact" : "Exact score"}
            hint={fr ? "score pile-poil" : "bang-on score"}
            value={r.exact_score}
            onChange={set("exact_score")}
            accent="text-violet-300"
          />
          <PointField
            icon={Target}
            label={fr ? "Total de buts — exact" : "Total goals — exact"}
            hint={fr ? "bon nombre de buts" : "right goal count"}
            value={r.total_goals_exact}
            onChange={set("total_goals_exact")}
            accent="text-gold-300"
          />
          <PointField
            icon={Target}
            label={fr ? "Total de buts — à ±1" : "Total goals — within 1"}
            hint={fr ? "total proche" : "close total"}
            value={r.total_goals_close}
            onChange={set("total_goals_close")}
            accent="text-gold-300"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-[10px] border border-primary-500/25 bg-primary-500/[0.07] px-4 py-3 text-xs text-text-secondary">
          <span>
            {fr ? "Max par match : " : "Max per match: "}
            <span className="font-display text-sm font-bold text-primary-300">
              {maxPerMatch}
            </span>{" "}
            pts
          </span>
          <span className="text-text-tertiary">
            {fr ? "Mauvais vainqueur → plafonné à " : "Wrong winner → capped at "}
            <span className="font-semibold text-text-secondary">
              {r.total_goals_exact}
            </span>{" "}
            pts
          </span>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={savePending}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99] disabled:opacity-60"
        >
          {savePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" strokeWidth={1.8} />
          )}
          {fr ? "Enregistrer le barème" : "Save scoring"}
        </button>
      </section>

      {/* Re-score */}
      <section className="rounded-md border border-gold-500/25 bg-gold-500/[0.05] p-5 backdrop-blur-xl">
        <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <RefreshCw className="size-4 text-gold-400" strokeWidth={1.8} />
          {fr ? "Re-scorer les matchs joués" : "Re-score played matches"}
        </h2>
        <p className="mb-4 max-w-2xl text-xs text-text-tertiary">
          {fr
            ? "Le nouveau barème s'applique tout seul aux prochains matchs. Pour l'appliquer aussi aux matchs DÉJÀ terminés (et donc recalculer le classement), lance un re-score. Aucune notification n'est envoyée aux joueurs."
            : "The new barème applies to upcoming matches automatically. To also apply it to ALREADY-finished matches (recomputing the standings), run a re-score. No notifications are sent to players."}
        </p>
        <button
          type="button"
          onClick={onRescore}
          disabled={rescorePending}
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-gold-500/40 bg-gold-500/[0.12] px-5 py-2.5 text-sm font-semibold text-gold-200 transition hover:bg-gold-500/[0.18] active:scale-[0.99] disabled:opacity-60"
        >
          {rescorePending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" strokeWidth={1.8} />
          )}
          {fr ? "Re-scorer maintenant" : "Re-score now"}
        </button>
      </section>
    </div>
  );
}

function PointField({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <label className="block rounded-[10px] border border-white/[0.08] bg-abyss/[0.4] p-3">
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
        <Icon className={`size-3.5 ${accent}`} strokeWidth={2} />
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-text-tertiary">+</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-20 rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-center font-display text-lg font-bold tabular-nums text-text-primary outline-none transition focus:border-primary-500"
        />
        <span className="text-[11px] text-text-tertiary">{hint}</span>
      </div>
    </label>
  );
}
