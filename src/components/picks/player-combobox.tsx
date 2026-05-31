"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type PlayerOption = {
  id: string;
  team_id: string;
  display_name: string;
  full_name: string;
  position: "GK" | "DEF" | "MID" | "FWD" | null;
  shirt_number: number | null;
  club: string | null;
  team_fifa_code: string;
};

/**
 * Searchable dropdown that lets the user pick exactly one player from a
 * list scoped to two teams (home + away). Designed to drop straight into a
 * pick'em row.
 *
 *  - empty state shows both teams' rosters grouped, "GK / DEF / MID / FWD"
 *  - typing filters by display + full name (case + accent insensitive)
 *  - selecting a player closes the dropdown and surfaces ✓ on the trigger
 *  - clicking the × clears the selection
 */
export function PlayerCombobox({
  selectedPlayerId,
  homeTeamPlayers,
  awayTeamPlayers,
  homeTeamLabel,
  awayTeamLabel,
  disabled = false,
  placeholder,
  onChange,
  locale,
}: {
  selectedPlayerId: string | null;
  homeTeamPlayers: PlayerOption[];
  awayTeamPlayers: PlayerOption[];
  homeTeamLabel: string;
  awayTeamLabel: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (player: PlayerOption | null) => void;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hoverIdx, setHoverIdx] = useState(0);

  // Find current selection across both teams.
  const selected = useMemo(() => {
    if (!selectedPlayerId) return null;
    return (
      homeTeamPlayers.find((p) => p.id === selectedPlayerId) ??
      awayTeamPlayers.find((p) => p.id === selectedPlayerId) ??
      null
    );
  }, [selectedPlayerId, homeTeamPlayers, awayTeamPlayers]);

  // Click outside → close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // When opened, focus the search input.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Build a flat, filtered, "team A then team B" list for keyboard nav.
  const flat = useMemo(() => {
    const q = normalize(query);
    function match(p: PlayerOption): boolean {
      if (!q) return true;
      return (
        normalize(p.display_name).includes(q) ||
        normalize(p.full_name).includes(q) ||
        (p.shirt_number != null && String(p.shirt_number) === q)
      );
    }
    return [
      ...homeTeamPlayers.filter(match),
      ...awayTeamPlayers.filter(match),
    ];
  }, [query, homeTeamPlayers, awayTeamPlayers]);

  function pick(p: PlayerOption) {
    onChange(p);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(i + 1, flat.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[hoverIdx];
      if (target) pick(target);
    }
  }

  const homeFiltered = useMemo(
    () => filterByQuery(homeTeamPlayers, query),
    [homeTeamPlayers, query],
  );
  const awayFiltered = useMemo(
    () => filterByQuery(awayTeamPlayers, query),
    [awayTeamPlayers, query],
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xs border px-2.5 py-1.5 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "border-violet-500/40 bg-violet-500/[0.08] text-text-primary"
            : "border-white/[0.08] bg-abyss/[0.5] text-text-tertiary hover:border-white/[0.16] hover:text-text-secondary",
        )}
      >
        <span className="truncate">
          {selected
            ? `${selected.team_fifa_code} · ${selected.display_name}`
            : (placeholder ??
              (locale === "fr" ? "Choisir un buteur…" : "Pick a scorer…"))}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={locale === "fr" ? "Retirer" : "Clear"}
            onClick={clear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") clear(e as never);
            }}
            className="shrink-0 rounded-full p-0.5 text-violet-300 hover:bg-violet-500/[0.18] hover:text-violet-200"
          >
            <X className="size-3" strokeWidth={2.5} />
          </span>
        ) : (
          <Search
            className="size-3 shrink-0 text-text-tertiary"
            strokeWidth={2}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-72 w-[min(320px,90vw)] overflow-hidden rounded-[10px] border border-white/[0.12] bg-abyss/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="border-b border-white/[0.08] p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary"
                strokeWidth={2}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHoverIdx(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={
                  locale === "fr" ? "Chercher un joueur…" : "Search a player…"
                }
                className="w-full rounded-xs border border-white/[0.08] bg-white/[0.04] py-1.5 pl-7 pr-2 text-xs text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-violet-500/40"
              />
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {flat.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-text-tertiary">
                {locale === "fr" ? "Aucun joueur." : "No player."}
              </li>
            ) : (
              <>
                {homeFiltered.length > 0 && (
                  <GroupLabel label={homeTeamLabel} />
                )}
                {homeFiltered.map((p) => (
                  <OptionRow
                    key={p.id}
                    player={p}
                    active={flat[hoverIdx]?.id === p.id}
                    selected={selectedPlayerId === p.id}
                    onPick={() => pick(p)}
                    onHover={() =>
                      setHoverIdx(flat.findIndex((f) => f.id === p.id))
                    }
                  />
                ))}
                {awayFiltered.length > 0 && (
                  <GroupLabel label={awayTeamLabel} />
                )}
                {awayFiltered.map((p) => (
                  <OptionRow
                    key={p.id}
                    player={p}
                    active={flat[hoverIdx]?.id === p.id}
                    selected={selectedPlayerId === p.id}
                    onPick={() => pick(p)}
                    onHover={() =>
                      setHoverIdx(flat.findIndex((f) => f.id === p.id))
                    }
                  />
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <li className="sticky top-0 z-10 bg-abyss/95 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
      {label}
    </li>
  );
}

function OptionRow({
  player,
  active,
  selected,
  onPick,
  onHover,
}: {
  player: PlayerOption;
  active: boolean;
  selected: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs transition",
        active && "bg-violet-500/[0.12] text-text-primary",
        !active && "text-text-secondary",
        selected && "font-bold text-violet-200",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {player.shirt_number != null && (
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-white/[0.06] font-mono text-[9px] font-bold tabular-nums text-text-tertiary">
            {player.shirt_number}
          </span>
        )}
        <span className="truncate">{player.display_name}</span>
        {player.position && (
          <span className="shrink-0 rounded-full bg-white/[0.05] px-1.5 text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
            {player.position}
          </span>
        )}
      </span>
      {selected && <Check className="size-3 shrink-0 text-violet-300" strokeWidth={2.5} />}
    </li>
  );
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function filterByQuery(players: PlayerOption[], query: string): PlayerOption[] {
  const q = normalize(query);
  if (!q) return players;
  return players.filter(
    (p) =>
      normalize(p.display_name).includes(q) ||
      normalize(p.full_name).includes(q) ||
      (p.shirt_number != null && String(p.shirt_number) === q),
  );
}
