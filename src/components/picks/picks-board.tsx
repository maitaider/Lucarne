"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  groupMatchesByDate,
  type MatchListItem,
} from "@/lib/matches/shared";
import { placeBet } from "@/lib/bets/place-bet";
import { useToast } from "@/components/ui/toast-provider";
import { BuyInBanner } from "@/components/paywall/buy-in-banner";
import { PickRow } from "./pick-row";
import { CalendarClock, Filter, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type Winner = "home" | "draw" | "away";

export type PickState = {
  winner: Winner | null;
  total_goals: number | null;
  scorers: string[]; // up to 4 names
};

type PicksMap = Record<string, PickState>;

type InitialPicks = Record<
  string,
  { bet_type: string; payload: unknown; status: string }[]
>;

function emptyState(): PickState {
  return { winner: null, total_goals: null, scorers: ["", "", "", ""] };
}

/**
 * Hydrate the per-match pick state from the server-side snapshot.
 * Only `validated` bets count as "active picks".
 */
function hydrate(initial: InitialPicks): PicksMap {
  const out: PicksMap = {};
  for (const [matchId, rows] of Object.entries(initial)) {
    const state = emptyState();
    for (const r of rows) {
      if (r.status !== "validated") continue;
      const payload = (r.payload ?? {}) as Record<string, unknown>;
      if (r.bet_type === "match_winner" && typeof payload.winner === "string") {
        const w = payload.winner;
        if (w === "home" || w === "draw" || w === "away") state.winner = w;
      } else if (
        r.bet_type === "total_goals" &&
        typeof payload.total === "number"
      ) {
        state.total_goals = payload.total;
      } else if (
        r.bet_type === "anytime_scorer" &&
        Array.isArray(payload.players)
      ) {
        const names = (payload.players as { player_name?: unknown }[])
          .map((p) => String(p?.player_name ?? "").trim())
          .filter((n) => n.length > 0)
          .slice(0, 4);
        for (let i = 0; i < 4; i++) state.scorers[i] = names[i] ?? "";
      }
    }
    out[matchId] = state;
  }
  return out;
}

function isLockedNow(match: MatchListItem): boolean {
  if (match.status !== "scheduled") return true;
  const kickoff = new Date(match.kickoff_at).getTime();
  return kickoff - 60 * 60 * 1000 < Date.now();
}

export function PicksBoard({
  matches,
  initialPicks,
  canBet,
  buyInAmountCents,
  currency,
  deadlineAt,
  deadlinePassed,
  locale,
}: {
  matches: MatchListItem[];
  initialPicks: InitialPicks;
  canBet: boolean;
  buyInAmountCents: number;
  currency: string;
  deadlineAt: string;
  deadlinePassed: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const toast = useToast();
  const [picks, setPicks] = useState<PicksMap>(() => hydrate(initialPicks));
  const [filter, setFilter] = useState<"all" | "open" | "todo">("open");
  const [, startTransition] = useTransition();

  // Stable list of openable matches (scheduled, not yet locked).
  const openMatches = useMemo(
    () => matches.filter((m) => !isLockedNow(m)),
    [matches],
  );
  const openCount = openMatches.length;
  const pickedCount = useMemo(() => {
    let c = 0;
    for (const m of openMatches) {
      if (picks[m.id]?.winner) c++;
    }
    return c;
  }, [picks, openMatches]);
  const pctDone = openCount > 0 ? Math.round((pickedCount / openCount) * 100) : 0;

  // What the board shows.
  const filteredMatches = useMemo(() => {
    if (filter === "all") return matches;
    if (filter === "open") return matches.filter((m) => !isLockedNow(m));
    // "todo" = openable AND no winner picked yet
    return matches.filter(
      (m) => !isLockedNow(m) && !picks[m.id]?.winner,
    );
  }, [filter, matches, picks]);

  const grouped = useMemo(
    () => groupMatchesByDate(filteredMatches),
    [filteredMatches],
  );
  const dateKeys = useMemo(
    () => Array.from(grouped.keys()).sort(),
    [grouped],
  );

  /**
   * Optimistic save helper. Updates local state instantly, then fires the
   * server action. On error we revert and toast.
   */
  function savePick(
    matchId: string,
    update: (prev: PickState) => PickState,
    bet:
      | { kind: "winner"; winner: Winner }
      | { kind: "total_goals"; total: number }
      | { kind: "scorers"; names: string[] },
  ) {
    const before = picks[matchId] ?? emptyState();
    const after = update(before);
    setPicks((cur) => ({ ...cur, [matchId]: after }));

    if (!canBet) {
      // Should not happen — UI disables interaction — but be safe.
      router.push("/buy-in");
      setPicks((cur) => ({ ...cur, [matchId]: before }));
      return;
    }

    const payload = (() => {
      if (bet.kind === "winner")
        return {
          bet_type: "match_winner" as const,
          match_id: matchId,
          payload: { winner: bet.winner },
        };
      if (bet.kind === "total_goals")
        return {
          bet_type: "total_goals" as const,
          match_id: matchId,
          payload: { total: bet.total },
        };
      return {
        bet_type: "anytime_scorer" as const,
        match_id: matchId,
        payload: {
          players: bet.names
            .map((n) => n.trim())
            .filter((n) => n.length >= 2)
            .slice(0, 4)
            .map((player_name) => ({ player_name })),
        },
      };
    })();

    startTransition(async () => {
      const res = await placeBet({
        match_id: matchId,
        league_id: null,
        bet: payload as never,
        stake_cents: 0,
        client_request_id: crypto.randomUUID(),
      });
      if (!res.ok) {
        toast.error(res.message);
        setPicks((cur) => ({ ...cur, [matchId]: before }));
      }
    });
  }

  function setWinner(matchId: string, w: Winner) {
    savePick(
      matchId,
      (prev) => ({ ...prev, winner: w }),
      { kind: "winner", winner: w },
    );
  }
  function setTotalGoals(matchId: string, n: number) {
    savePick(
      matchId,
      (prev) => ({ ...prev, total_goals: n }),
      { kind: "total_goals", total: n },
    );
  }
  function setScorers(matchId: string, names: string[]) {
    savePick(
      matchId,
      (prev) => ({ ...prev, scorers: names }),
      { kind: "scorers", names },
    );
  }

  return (
    <div>
      {/* Buy-in paywall — shown at top when needed */}
      {!canBet && (
        <BuyInBanner
          amountCents={buyInAmountCents}
          currency={currency}
          deadlineAt={deadlineAt}
          deadlinePassed={deadlinePassed}
          locale={locale}
        />
      )}

      {/* Progress + filter (sticky on scroll) */}
      <section className="sticky top-[64px] z-30 mb-4 rounded-[12px] border border-white/[0.1] bg-abyss/[0.85] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-[8px] border border-primary-500/35 bg-primary-500/[0.1] text-primary-300">
              <Target className="size-4" strokeWidth={1.8} />
            </span>
            <div>
              <div className="font-display text-base font-semibold tabular-nums text-text-primary">
                {pickedCount}
                <span className="text-text-tertiary"> / {openCount}</span>{" "}
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  {locale === "fr" ? "pronos" : "picks"}
                </span>
              </div>
              <div className="text-[10px] text-text-tertiary">
                {locale === "fr"
                  ? `Ouverts > 1 h avant le coup d'envoi · ${pctDone}% fait`
                  : `Open >1 h before kickoff · ${pctDone}% done`}
              </div>
            </div>
          </div>

          <FilterPill
            value={filter}
            onChange={setFilter}
            locale={locale}
            todoCount={Math.max(openCount - pickedCount, 0)}
          />
        </div>

        {/* progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-gold-400 transition-[width] duration-300"
            style={{ width: `${pctDone}%` }}
          />
        </div>
      </section>

      {/* Match list */}
      {filteredMatches.length === 0 ? (
        <EmptyState locale={locale} filter={filter} />
      ) : (
        <div className="space-y-6">
          {dateKeys.map((date) => (
            <section key={date}>
              <DayHeader date={date} locale={locale} />
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[12px] border border-white/[0.08] bg-surface-1/[0.6] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                {grouped.get(date)!.map((m) => (
                  <PickRow
                    key={m.id}
                    match={m}
                    pick={picks[m.id] ?? emptyState()}
                    canBet={canBet}
                    locked={isLockedNow(m)}
                    onWinner={(w) => setWinner(m.id, w)}
                    onTotalGoals={(n) => setTotalGoals(m.id, n)}
                    onScorers={(names) => setScorers(m.id, names)}
                    locale={locale}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  value,
  onChange,
  locale,
  todoCount,
}: {
  value: "all" | "open" | "todo";
  onChange: (v: "all" | "open" | "todo") => void;
  locale: Locale;
  todoCount: number;
}) {
  const items: {
    key: "all" | "open" | "todo";
    fr: string;
    en: string;
    count?: number;
  }[] = [
    {
      key: "todo",
      fr: "À faire",
      en: "To do",
      count: todoCount,
    },
    { key: "open", fr: "Ouverts", en: "Open" },
    { key: "all", fr: "Tous", en: "All" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1">
      <Filter className="ml-1.5 size-3 text-text-tertiary" strokeWidth={2} />
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition",
              active
                ? "bg-primary-500 text-abyss shadow-glow-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {locale === "fr" ? it.fr : it.en}
            {typeof it.count === "number" && it.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
                  active
                    ? "bg-abyss/25 text-abyss"
                    : "bg-primary-500/15 text-primary-300",
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayHeader({ date, locale }: { date: string; locale: Locale }) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-tertiary">
      <CalendarClock className="size-3.5" strokeWidth={1.7} />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

function EmptyState({
  locale,
  filter,
}: {
  locale: Locale;
  filter: "all" | "open" | "todo";
}) {
  const msg = (() => {
    if (filter === "todo")
      return locale === "fr"
        ? "Tout est pronostiqué pour les matchs ouverts. Beau boulot."
        : "Every open match is picked. Nice work.";
    if (filter === "open")
      return locale === "fr"
        ? "Aucun match ouvert pour le moment."
        : "No open match right now.";
    return locale === "fr"
      ? "Le calendrier est encore vide."
      : "Calendar is still empty.";
  })();
  return (
    <div className="rounded-[12px] border border-dashed border-white/[0.12] bg-surface-1/[0.55] p-8 text-center text-sm text-text-secondary backdrop-blur-xl">
      {msg}
    </div>
  );
}
