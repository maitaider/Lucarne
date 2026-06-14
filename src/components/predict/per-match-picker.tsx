"use client";

import { Flag } from "@/components/team/flag";
import { CheckCircle2, CircleDashed, Loader2, Lock, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchListItem } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import type { MatchPick } from "./predict-board";

function isLockedNow(match: { kickoff_at: string; status: string }): boolean {
  if (match.status !== "scheduled") return true;
  const kickoff = new Date(match.kickoff_at).getTime();
  return kickoff - 60 * 60 * 1000 < Date.now();
}

/**
 * Compact per-match row. The user enters a SCORELINE for both teams with two
 * steppers; the result (win/draw) and the total goals derive from the score.
 * Scoring is score-only — no scorer picks.
 *
 * The score stays a LOCAL DRAFT until the user clicks "Confirmer le pronostic":
 * `onScore` only edits the draft; `onConfirm` is the only thing that persists.
 */
export function PerMatchPicker({
  match,
  pick,
  canEdit,
  onScore,
  onConfirm,
  dirty,
  confirmed,
  pending,
  locale,
  compact = false,
}: {
  match: MatchListItem;
  /** The value to DISPLAY: the local draft if any, else the confirmed pick. */
  pick: MatchPick;
  canEdit: boolean;
  /** Edits the local draft (no persistence). */
  onScore: (home: number, away: number) => void;
  /** Commits the draft via placeBet (the only thing that persists). */
  onConfirm: () => void;
  /** Draft differs from the confirmed pick → there's something to confirm. */
  dirty: boolean;
  /** A confirmed score already exists for this match. */
  confirmed: boolean;
  /** A confirm is currently in flight for this match. */
  pending: boolean;
  locale: Locale;
  /** Tighter padding when used inside a knockout tie row. */
  compact?: boolean;
}) {
  const locked = isLockedNow(match);
  // Freeze inputs while a confirm is in flight: promoting the draft on success
  // clears it, so a concurrent edit would otherwise be silently dropped.
  const disabled = !canEdit || locked || pending;
  const fr = locale === "fr";

  const homeName = match.home_team
    ? fr
      ? match.home_team.name_fr
      : match.home_team.name_en
    : (match.home_placeholder ?? "?");
  const awayName = match.away_team
    ? fr
      ? match.away_team.name_fr
      : match.away_team.name_en
    : (match.away_placeholder ?? "?");
  const time = new Date(match.kickoff_at).toLocaleTimeString(
    fr ? "fr-CA" : "en-CA",
    { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" },
  );

  const h = pick.home_goals;
  const a = pick.away_goals;
  const hasScore = h != null && a != null;
  const homeWins = hasScore && h > a;
  const awayWins = hasScore && a > h;

  const setScore = (nh: number, na: number) =>
    onScore(Math.max(0, Math.min(9, nh)), Math.max(0, Math.min(9, na)));

  return (
    <li
      className={cn(
        "transition",
        hasScore && !disabled && "bg-primary-500/[0.04]",
        disabled && "opacity-70",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5",
          compact ? "px-2 py-1.5" : "px-2.5 py-2 sm:px-3",
        )}
      >
        {/* Time */}
        <div className="flex w-9 flex-col items-center">
          <span className="font-mono text-[10px] font-semibold tabular-nums text-text-secondary">
            {time}
          </span>
          {locked && (
            <Lock className="mt-0.5 size-2.5 text-text-tertiary" strokeWidth={2.5} />
          )}
        </div>

        {/* Home */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-right">
          <span
            className={cn(
              "truncate text-xs font-semibold",
              homeWins ? "text-text-primary" : "text-text-secondary",
            )}
            title={homeName}
          >
            {homeName}
          </span>
          <Flag isoCode={match.home_team?.iso_code ?? null} size="sm" />
        </div>

        {/* Scoreline steppers */}
        <div className="flex items-center gap-1">
          <ScoreStepper
            value={h}
            disabled={disabled}
            onDec={() => setScore((h ?? 0) - 1, a ?? 0)}
            onInc={() => setScore((h ?? 0) + 1, a ?? 0)}
          />
          <span className="text-[11px] font-bold text-text-tertiary">–</span>
          <ScoreStepper
            value={a}
            disabled={disabled}
            onDec={() => setScore(h ?? 0, (a ?? 0) - 1)}
            onInc={() => setScore(h ?? 0, (a ?? 0) + 1)}
          />
        </div>

        {/* Away */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Flag isoCode={match.away_team?.iso_code ?? null} size="sm" />
          <span
            className={cn(
              "truncate text-xs font-semibold",
              awayWins ? "text-text-primary" : "text-text-secondary",
            )}
            title={awayName}
          >
            {awayName}
          </span>
        </div>
      </div>

      {/* Confirm footer — nothing persists until the user clicks here. The
          score stays a local draft while `dirty`; the click commits it via
          placeBet (the parent's onConfirm). */}
      {(dirty || pending || confirmed) && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t border-white/[0.05] bg-white/[0.015]",
            compact ? "px-2 py-1.5" : "px-2.5 py-1.5 sm:px-3",
          )}
        >
          {pending ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-primary-300">
              <Loader2 className="size-3 shrink-0 animate-spin" strokeWidth={2.5} />
              <span className="truncate">{fr ? "Enregistrement…" : "Saving…"}</span>
            </span>
          ) : dirty ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-gold-300">
              <CircleDashed className="size-3 shrink-0" strokeWidth={2.5} />
              <span className="truncate">
                {fr ? "Brouillon non enregistré" : "Unsaved draft"}
              </span>
            </span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-emerald-300/90">
              <CheckCircle2 className="size-3 shrink-0" strokeWidth={2.5} />
              <span className="truncate">{fr ? "Confirmé" : "Confirmed"}</span>
            </span>
          )}

          {(dirty || pending) && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled || pending || !dirty}
              title={fr ? "Confirmer le pronostic" : "Confirm this prediction"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary-500 px-3.5 py-1.5 text-xs font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 sm:px-2.5 sm:py-1 sm:text-[11px]"
            >
              {pending ? (
                <Loader2 className="size-3 animate-spin" strokeWidth={2.5} />
              ) : (
                <CheckCircle2 className="size-3" strokeWidth={2.5} />
              )}
              {fr ? "Confirmer le pronostic" : "Confirm prediction"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ScoreStepper({
  value,
  disabled,
  onDec,
  onInc,
}: {
  value: number | null;
  disabled: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-sm border border-border-strong/50">
      <button
        type="button"
        onClick={onDec}
        disabled={disabled || (value ?? 0) <= 0}
        aria-label="−"
        className="flex size-9 items-center justify-center text-text-secondary transition hover:bg-white/[0.08] hover:text-text-primary active:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent sm:size-7"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span
        key={value ?? "empty"}
        className={cn(
          "lk-pop w-8 text-center font-display text-lg font-bold tabular-nums sm:w-6 sm:text-base",
          value == null ? "text-text-tertiary" : "text-text-primary",
        )}
      >
        {value ?? "–"}
      </span>
      <button
        type="button"
        onClick={onInc}
        disabled={disabled || (value ?? 0) >= 9}
        aria-label="+"
        className="flex size-9 items-center justify-center text-text-secondary transition hover:bg-primary-500/20 hover:text-primary-200 active:bg-primary-500/30 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent sm:size-7"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
