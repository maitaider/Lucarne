"use client";

import { useState } from "react";
import type { MatchListItem } from "@/lib/matches/shared";
import { TeamEmblem } from "@/components/team/team-emblem";
import { POINTS_SCHEME } from "@/lib/bets/types";
import { ChevronDown, Lock, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { PickState, Winner } from "./picks-board";

/**
 * One pick row = one match. Default surface shows only the three winner
 * buttons (1 / N / 2). "+ Plus" expands an inline block with total goals
 * and scorers — the optional extras for users who want more points.
 */
export function PickRow({
  match,
  pick,
  canBet,
  locked,
  onWinner,
  onTotalGoals,
  onScorers,
  locale,
}: {
  match: MatchListItem;
  pick: PickState;
  canBet: boolean;
  locked: boolean;
  onWinner: (w: Winner) => void;
  onTotalGoals: (n: number) => void;
  onScorers: (names: string[]) => void;
  locale: Locale;
}) {
  const [expanded, setExpanded] = useState(false);

  const homeName = teamName(match.home_team, match.home_placeholder, locale);
  const awayName = teamName(match.away_team, match.away_placeholder, locale);
  const kickoff = new Date(match.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" },
  );

  const hasExtras =
    pick.total_goals !== null ||
    pick.scorers.some((s) => s.trim().length >= 2);

  const disabled = !canBet || locked;
  const lockReason = (() => {
    if (!canBet) return locale === "fr" ? "Place requise" : "Seat required";
    if (match.status === "live")
      return locale === "fr" ? "Live" : "Live";
    if (match.status === "finished")
      return locale === "fr" ? "Terminé" : "Final";
    if (locked) return locale === "fr" ? "Verrouillé" : "Locked";
    return null;
  })();

  return (
    <li
      className={cn(
        "transition",
        pick.winner && !disabled && "bg-primary-500/[0.04]",
        disabled && "opacity-70",
      )}
    >
      {/* Main row: time | home | vs | away | [1][N][2] | + */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        {/* Time column */}
        <div className="flex w-12 flex-col items-center sm:w-14">
          <span className="font-mono text-[11px] font-semibold tabular-nums text-text-secondary sm:text-xs">
            {timeStr}
          </span>
          {lockReason && (
            <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-text-tertiary">
              {(!canBet || locked) && <Lock className="size-2" strokeWidth={2.5} />}
              {lockReason}
            </span>
          )}
        </div>

        {/* Home team (aligned right) */}
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span
            className={cn(
              "truncate text-sm font-semibold sm:text-[15px]",
              pick.winner === "home" ? "text-text-primary" : "text-text-secondary",
            )}
            title={homeName}
          >
            {homeName}
          </span>
          <TeamEmblem
            code={match.home_team?.fifa_code}
            name={homeName}
            size="sm"
          />
        </div>

        {/* 3 winner buttons (vs in the centre) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <WinnerBtn
            label="1"
            active={pick.winner === "home"}
            disabled={disabled}
            onClick={() => onWinner("home")}
            locale={locale}
            aria={locale === "fr" ? `${homeName} gagne` : `${homeName} wins`}
          />
          <WinnerBtn
            label="N"
            active={pick.winner === "draw"}
            disabled={disabled}
            onClick={() => onWinner("draw")}
            locale={locale}
            aria={locale === "fr" ? "Match nul" : "Draw"}
          />
          <WinnerBtn
            label="2"
            active={pick.winner === "away"}
            disabled={disabled}
            onClick={() => onWinner("away")}
            locale={locale}
            aria={locale === "fr" ? `${awayName} gagne` : `${awayName} wins`}
          />
        </div>

        {/* Away team */}
        <div className="flex min-w-0 items-center gap-2">
          <TeamEmblem
            code={match.away_team?.fifa_code}
            name={awayName}
            size="sm"
          />
          <span
            className={cn(
              "truncate text-sm font-semibold sm:text-[15px]",
              pick.winner === "away" ? "text-text-primary" : "text-text-secondary",
            )}
            title={awayName}
          >
            {awayName}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          disabled={disabled}
          className={cn(
            "ml-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50",
            expanded
              ? "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30"
              : hasExtras
                ? "bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30 hover:bg-gold-500/20"
                : "text-text-tertiary hover:bg-white/[0.05] hover:text-text-primary",
          )}
          title={
            locale === "fr"
              ? "Plus de paris (buts, buteurs)"
              : "More picks (goals, scorers)"
          }
        >
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              expanded && "rotate-180",
            )}
            strokeWidth={2.5}
          />
          <span className="hidden sm:inline">
            {hasExtras
              ? locale === "fr"
                ? "+1"
                : "+1"
              : locale === "fr"
                ? "+"
                : "+"}
          </span>
        </button>
      </div>

      {/* Extras (inline, collapsed by default) */}
      {expanded && (
        <div className="grid gap-3 border-t border-white/[0.05] bg-white/[0.025] px-3 py-3 sm:grid-cols-2 sm:px-4 sm:py-4">
          <TotalGoalsPicker
            value={pick.total_goals}
            disabled={disabled}
            onSelect={onTotalGoals}
            locale={locale}
          />
          <ScorerInputs
            value={pick.scorers}
            disabled={disabled}
            onChange={onScorers}
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
  aria,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  locale: Locale;
  aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      aria-pressed={active}
      className={cn(
        "flex size-9 items-center justify-center rounded-[8px] font-display text-sm font-bold tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:cursor-not-allowed disabled:opacity-50 sm:size-10 sm:text-base",
        active
          ? "bg-primary-500 text-abyss shadow-glow-primary scale-105"
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

function ScorerInputs({
  value,
  disabled,
  onChange,
  homeName,
  awayName,
  locale,
}: {
  value: string[];
  disabled: boolean;
  onChange: (names: string[]) => void;
  homeName: string;
  awayName: string;
  locale: Locale;
}) {
  // Track local edits without bouncing them through the server on every
  // keystroke — we only fire onChange when the input blurs (or Enter).
  const [draft, setDraft] = useState<string[]>(value);

  function commit(i: number, v: string) {
    const next = [...draft];
    next[i] = v;
    setDraft(next);
  }
  function flush() {
    // Only fire if something genuinely changed vs the parent state.
    const changed = draft.some((s, i) => s !== value[i]);
    if (changed) onChange(draft);
  }

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
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            type="text"
            value={draft[i] ?? ""}
            onChange={(e) => commit(i, e.target.value)}
            onBlur={flush}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                flush();
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={disabled}
            placeholder={
              i < 2
                ? truncate(homeName, 12)
                : truncate(awayName, 12)
            }
            maxLength={60}
            className={cn(
              "w-full rounded-[6px] border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-xs text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function teamName(
  team: { name_fr: string; name_en: string } | null,
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? "—";
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
