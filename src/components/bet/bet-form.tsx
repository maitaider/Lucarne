"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2, CheckCircle2, Zap } from "lucide-react";
import { placeBet } from "@/lib/bets/place-bet";
import { POINTS_SCHEME, type PlaceBetForm } from "@/lib/bets/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type BetType = "match_winner" | "exact_score";

export function BetForm({
  matchId,
  homeName,
  awayName,
  locale,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  kickoffAt: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [betType, setBetType] = useState<BetType>("match_winner");
  const [winner, setWinner] = useState<"home" | "draw" | "away">("home");
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { kind: "success"; betId: string } | { kind: "error"; message: string } | null
  >(null);

  function buildPayload(): PlaceBetForm["bet"] {
    if (betType === "match_winner") {
      return {
        bet_type: "match_winner",
        match_id: matchId,
        payload: { winner },
      };
    }
    return {
      bet_type: "exact_score",
      match_id: matchId,
      payload: { home: homeScore, away: awayScore },
    };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await placeBet({
        match_id: matchId,
        league_id: null,
        bet: buildPayload(),
        stake_cents: 0,
        client_request_id: crypto.randomUUID(),
      });
      if (res.ok) {
        setResult({ kind: "success", betId: res.betId });
        router.refresh();
      } else {
        setResult({ kind: "error", message: res.message });
      }
    });
  }

  const potentialPoints =
    betType === "match_winner"
      ? POINTS_SCHEME.match_winner
      : POINTS_SCHEME.exact_score;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
    >
      {/* Bet type toggle */}
      <div className="mb-6 flex gap-2">
        <BetTypeButton
          active={betType === "match_winner"}
          onClick={() => setBetType("match_winner")}
          label={locale === "fr" ? "Vainqueur (1N2)" : "Match winner"}
          multiplier={POINTS_SCHEME.match_winner}
        />
        <BetTypeButton
          active={betType === "exact_score"}
          onClick={() => setBetType("exact_score")}
          label={locale === "fr" ? "Score exact" : "Exact score"}
          multiplier={POINTS_SCHEME.exact_score}
        />
      </div>

      {betType === "match_winner" ? (
        <div className="mb-6 grid grid-cols-3 gap-2">
          <ChoiceButton
            active={winner === "home"}
            onClick={() => setWinner("home")}
            primary={homeName}
            secondary={locale === "fr" ? "Domicile" : "Home"}
          />
          <ChoiceButton
            active={winner === "draw"}
            onClick={() => setWinner("draw")}
            primary={locale === "fr" ? "Nul" : "Draw"}
            secondary="—"
          />
          <ChoiceButton
            active={winner === "away"}
            onClick={() => setWinner("away")}
            primary={awayName}
            secondary={locale === "fr" ? "Extérieur" : "Away"}
          />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreInput
            label={homeName}
            value={homeScore}
            onChange={setHomeScore}
          />
          <span className="font-display text-2xl text-text-tertiary">·</span>
          <ScoreInput
            label={awayName}
            value={awayScore}
            onChange={setAwayScore}
            align="right"
          />
        </div>
      )}

      {/* Points preview (no stake — bets are free, points-only) */}
      <div className="mb-6 rounded-[8px] border border-primary-500/[0.14] bg-primary-500/[0.07] px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Zap className="size-4 text-primary-400" strokeWidth={2} />
            {locale === "fr" ? "Points si correct" : "Points if correct"}
          </span>
          <span className="font-display text-2xl font-semibold tabular-nums text-primary-400">
            +{potentialPoints}
            <span className="ml-1 text-xs text-text-secondary">
              {locale === "fr" ? "pts" : "pts"}
            </span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-text-tertiary">
          {locale === "fr"
            ? "Modifiable jusqu'à 1 h avant le coup d'envoi. Pas de mise — top 3 partage la cagnotte."
            : "Editable up to 1h before kickoff. No stake — top 3 split the pot."}
        </p>
      </div>

      {result?.kind === "success" && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary-500/30 bg-primary-500/10 px-4 py-3 text-sm text-primary-400">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {locale === "fr"
              ? "Pari placé ! Statut : en attente de validation admin."
              : "Bet placed! Status: pending admin validation."}
          </span>
        </div>
      )}
      {result?.kind === "error" && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-4 py-3 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {locale === "fr" ? "Valider le pari" : "Confirm bet"}
      </button>
    </form>
  );
}

function BetTypeButton({
  active,
  onClick,
  label,
  multiplier,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  multiplier: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center rounded-[8px] border px-4 py-3 text-sm font-semibold transition",
        active
          ? "border-primary-500/40 bg-primary-500/10 text-primary-400"
          : "border-white/[0.08] bg-white/[0.045] text-text-secondary hover:border-primary-500/35",
      )}
    >
      <span>{label}</span>
      <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider opacity-70">
        +{multiplier} pts
      </span>
    </button>
  );
}

function ChoiceButton({
  active,
  onClick,
  primary,
  secondary,
}: {
  active: boolean;
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] border px-3 py-4 text-center transition",
        active
          ? "border-primary-500/40 bg-primary-500/10 ring-1 ring-primary-500/20"
          : "border-white/[0.08] bg-white/[0.045] hover:border-primary-500/35",
      )}
    >
      <div
        className={cn(
          "truncate text-sm font-semibold",
          active ? "text-text-primary" : "text-text-secondary",
        )}
      >
        {primary}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
        {secondary}
      </div>
    </button>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  align = "left",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="mb-2 truncate text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.48] px-3 py-3 text-center font-display text-3xl font-semibold tabular-nums text-text-primary outline-none transition focus:border-primary-500"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
    </div>
  );
}
