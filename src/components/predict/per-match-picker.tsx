"use client";

import { useState } from "react";
import { Flag } from "@/components/team/flag";
import {
  PlayerCombobox,
  type PlayerOption,
} from "@/components/picks/player-combobox";
import { POINTS_SCHEME } from "@/lib/bets/types";
import { ChevronDown, Lock, Minus, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchListItem } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import type { MatchPick, ScorerPick } from "./predict-board";

function isLockedNow(match: { kickoff_at: string; status: string }): boolean {
  if (match.status !== "scheduled") return true;
  const kickoff = new Date(match.kickoff_at).getTime();
  return kickoff - 60 * 60 * 1000 < Date.now();
}

/**
 * Compact per-match row. The user enters a SCORELINE for both teams with
 * two steppers; the result (win/draw) derives from the score. A "+" toggle
 * reveals scorers. Used in the GroupCard fixtures list.
 */
export function PerMatchPicker({
  match,
  pick,
  homePlayers,
  awayPlayers,
  canEdit,
  onScore,
  onScorers,
  locale,
  compact = false,
}: {
  match: MatchListItem;
  pick: MatchPick;
  homePlayers: PlayerOption[];
  awayPlayers: PlayerOption[];
  canEdit: boolean;
  onScore: (home: number, away: number) => void;
  onScorers: (picks: ScorerPick[]) => void;
  locale: Locale;
  /** Tighter padding when used inside a knockout tie row. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const locked = isLockedNow(match);
  const disabled = !canEdit || locked;
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
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" },
  );

  const h = pick.home_goals;
  const a = pick.away_goals;
  const hasScore = h != null && a != null;
  const homeWins = hasScore && h > a;
  const awayWins = hasScore && a > h;
  const hasScorers = pick.scorers.length > 0;

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
          "grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1.5",
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

        {/* Scorers toggle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          disabled={disabled}
          title={fr ? "Buteurs" : "Scorers"}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50",
            expanded
              ? "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30"
              : hasScorers
                ? "bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30"
                : "text-text-tertiary hover:bg-white/[0.05] hover:text-text-primary",
          )}
        >
          <ChevronDown
            className={cn("size-3 transition-transform", expanded && "rotate-180")}
            strokeWidth={2.5}
          />
          {hasScorers ? `+${pick.scorers.length}` : "+"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.05] bg-white/[0.025] px-3 py-3">
          <ScorerSlots
            value={pick.scorers}
            disabled={disabled}
            onChange={onScorers}
            homePlayers={homePlayers}
            awayPlayers={awayPlayers}
            homeName={homeName}
            awayName={awayName}
            locale={locale}
          />
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
        className="flex size-6 items-center justify-center text-text-secondary transition hover:bg-white/[0.08] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="size-3" strokeWidth={2.5} />
      </button>
      <span
        key={value ?? "empty"}
        className={cn(
          "lk-pop w-5 text-center font-display text-sm font-bold tabular-nums",
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
        className="flex size-6 items-center justify-center text-text-secondary transition hover:bg-primary-500/20 hover:text-primary-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function ScorerSlots({
  value,
  disabled,
  onChange,
  homePlayers,
  awayPlayers,
  homeName,
  awayName,
  locale,
}: {
  value: ScorerPick[];
  disabled: boolean;
  onChange: (picks: ScorerPick[]) => void;
  homePlayers: PlayerOption[];
  awayPlayers: PlayerOption[];
  homeName: string;
  awayName: string;
  locale: Locale;
}) {
  function setSlot(idx: number, player: PlayerOption | null) {
    const next = [...value];
    if (player) {
      next[idx] = { player_id: player.id, player_name: player.display_name };
    } else if (idx < next.length) {
      next.splice(idx, 1);
    }
    const seen = new Set<string>();
    const cleaned = next
      .filter((p) => {
        if (!p?.player_id) return false;
        if (seen.has(p.player_id)) return false;
        seen.add(p.player_id);
        return true;
      })
      .slice(0, 4);
    onChange(cleaned);
  }

  const slots: Array<ScorerPick | null> = [null, null, null, null];
  value.slice(0, 4).forEach((p, i) => {
    slots[i] = p;
  });

  const noRoster = homePlayers.length === 0 && awayPlayers.length === 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <Users className="size-3 text-violet-300" strokeWidth={2} />
        {locale === "fr" ? "Buteurs" : "Scorers"}
        <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[9px] font-bold text-violet-300 ring-1 ring-violet-500/25">
          +{POINTS_SCHEME.anytime_scorer_each}/
          {locale === "fr" ? "joueur" : "player"}
        </span>
      </div>
      {noRoster ? (
        <div className="rounded-sm border border-dashed border-white/[0.08] bg-white/[0.02] px-2 py-3 text-center text-[10px] text-text-tertiary">
          {locale === "fr"
            ? "Effectifs pas encore disponibles."
            : "Rosters not available yet."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {slots.map((p, i) => (
            <PlayerCombobox
              key={i}
              selectedPlayerId={p?.player_id ?? null}
              homeTeamPlayers={homePlayers}
              awayTeamPlayers={awayPlayers}
              homeTeamLabel={homeName}
              awayTeamLabel={awayName}
              disabled={disabled}
              placeholder={
                locale === "fr" ? `Buteur ${i + 1}` : `Scorer ${i + 1}`
              }
              onChange={(player) => setSlot(i, player)}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
