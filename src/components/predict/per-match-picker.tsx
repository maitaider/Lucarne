"use client";

import { useState } from "react";
import type { MatchListItem } from "@/lib/matches/shared";
import { Flag } from "@/components/team/flag";
import {
  PlayerCombobox,
  type PlayerOption,
} from "@/components/picks/player-combobox";
import { POINTS_SCHEME } from "@/lib/bets/types";
import { ChevronDown, Lock, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { MatchPick, ScorerPick, Winner } from "./predict-board";

function isLockedNow(match: { kickoff_at: string; status: string }): boolean {
  if (match.status !== "scheduled") return true;
  const kickoff = new Date(match.kickoff_at).getTime();
  return kickoff - 60 * 60 * 1000 < Date.now();
}

/**
 * Compact per-match row — used both inside the GroupCard (group fixtures)
 * and inside the KnockoutTie expandable area. Shows time + flag/name on
 * each side + [1][N][2] winner buttons + a "+" toggle for total goals
 * and scorers.
 */
export function PerMatchPicker({
  match,
  pick,
  homePlayers,
  awayPlayers,
  canEdit,
  onWinner,
  onTotalGoals,
  onScorers,
  locale,
  compact = false,
}: {
  match: MatchListItem;
  pick: MatchPick;
  homePlayers: PlayerOption[];
  awayPlayers: PlayerOption[];
  canEdit: boolean;
  onWinner: (w: Winner) => void;
  onTotalGoals: (n: number) => void;
  onScorers: (picks: ScorerPick[]) => void;
  locale: Locale;
  /** Tighter padding when used inside a knockout tie row. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const locked = isLockedNow(match);
  const disabled = !canEdit || locked;

  const homeName = match.home_team
    ? locale === "fr"
      ? match.home_team.name_fr
      : match.home_team.name_en
    : (match.home_placeholder ?? "?");
  const awayName = match.away_team
    ? locale === "fr"
      ? match.away_team.name_fr
      : match.away_team.name_en
    : (match.away_placeholder ?? "?");
  const time = new Date(match.kickoff_at).toLocaleTimeString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" },
  );

  const hasExtras =
    pick.total_goals !== null || pick.scorers.length > 0;

  return (
    <li
      className={cn(
        "transition",
        pick.winner && !disabled && "bg-primary-500/[0.04]",
        disabled && "opacity-70",
      )}
    >
      {/* Row */}
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2",
          compact ? "px-2 py-1.5" : "px-3 py-2 sm:px-4 sm:py-2.5",
        )}
      >
        {/* Time */}
        <div className="flex w-10 flex-col items-center">
          <span className="font-mono text-[10px] font-semibold tabular-nums text-text-secondary">
            {time}
          </span>
          {locked && (
            <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-text-tertiary">
              <Lock className="size-2" strokeWidth={2.5} />
            </span>
          )}
        </div>

        {/* Home */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-right">
          <span
            className={cn(
              "truncate text-xs font-semibold sm:text-[13px]",
              pick.winner === "home"
                ? "text-text-primary"
                : "text-text-secondary",
            )}
            title={homeName}
          >
            {homeName}
          </span>
          <Flag isoCode={match.home_team?.iso_code ?? null} size="sm" />
        </div>

        {/* 1/N/2 */}
        <div className="flex items-center gap-1">
          <WinnerBtn
            label="1"
            active={pick.winner === "home"}
            disabled={disabled}
            onClick={() => onWinner("home")}
          />
          <WinnerBtn
            label="N"
            active={pick.winner === "draw"}
            disabled={disabled}
            onClick={() => onWinner("draw")}
          />
          <WinnerBtn
            label="2"
            active={pick.winner === "away"}
            disabled={disabled}
            onClick={() => onWinner("away")}
          />
        </div>

        {/* Away */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Flag isoCode={match.away_team?.iso_code ?? null} size="sm" />
          <span
            className={cn(
              "truncate text-xs font-semibold sm:text-[13px]",
              pick.winner === "away"
                ? "text-text-primary"
                : "text-text-secondary",
            )}
            title={awayName}
          >
            {awayName}
          </span>
        </div>

        {/* + toggle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          disabled={disabled}
          className={cn(
            "ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50",
            expanded
              ? "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30"
              : hasExtras
                ? "bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30 hover:bg-gold-500/20"
                : "text-text-tertiary hover:bg-white/[0.05] hover:text-text-primary",
          )}
          title={
            locale === "fr" ? "Buts + buteurs" : "Goals + scorers"
          }
        >
          <ChevronDown
            className={cn("size-3 transition-transform", expanded && "rotate-180")}
            strokeWidth={2.5}
          />
          {hasExtras ? "+1" : "+"}
        </button>
      </div>

      {/* Expanded extras */}
      {expanded && (
        <div className="grid gap-3 border-t border-white/[0.05] bg-white/[0.025] px-3 py-3 sm:grid-cols-2 sm:px-4 sm:py-4">
          <TotalGoalsPicker
            value={pick.total_goals}
            disabled={disabled}
            onSelect={onTotalGoals}
            locale={locale}
          />
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

function WinnerBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-[6px] font-display text-xs font-bold tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "scale-105 bg-primary-500 text-abyss shadow-glow-primary"
          : "bg-white/[0.05] text-text-secondary ring-1 ring-white/[0.08] hover:bg-white/[0.1] hover:text-text-primary",
      )}
    >
      {label}
    </button>
  );
}

function TotalGoalsPicker({
  value,
  disabled,
  onSelect,
  locale,
}: {
  value: number | null;
  disabled: boolean;
  onSelect: (n: number) => void;
  locale: Locale;
}) {
  const choices = [0, 1, 2, 3, 4, 5];
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <Target className="size-3 text-gold-300" strokeWidth={2} />
        {locale === "fr" ? "Total buts" : "Total goals"}
        <span className="rounded-full bg-gold-500/15 px-1.5 py-px text-[9px] font-bold text-gold-300 ring-1 ring-gold-500/25">
          +{POINTS_SCHEME.total_goals_exact}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {choices.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              disabled={disabled}
              className={cn(
                "rounded-[6px] py-1.5 font-display text-sm font-bold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "bg-gold-500 text-abyss shadow-glow-gold"
                  : "bg-white/[0.05] text-text-secondary ring-1 ring-white/[0.08] hover:bg-white/[0.1] hover:text-text-primary",
              )}
            >
              {n === 5 ? "5+" : n}
            </button>
          );
        })}
      </div>
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
      next[idx] = {
        player_id: player.id,
        player_name: player.display_name,
      };
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
        <div className="rounded-[6px] border border-dashed border-white/[0.08] bg-white/[0.02] px-2 py-3 text-center text-[10px] text-text-tertiary">
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
