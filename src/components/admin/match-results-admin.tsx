"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import {
  setMatchResultAction,
  recomputeMatchAction,
} from "@/lib/matches/admin-actions";
import {
  isAwaitingResult,
  compareLiveThenKickoff,
  type MatchListItem,
  type TeamSnippet,
} from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Loader2, Minus, Plus, RefreshCw, Search } from "lucide-react";

const STATUSES = [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
] as const;

const STATUS_LABEL: Record<string, { fr: string; en: string }> = {
  scheduled: { fr: "À venir", en: "Scheduled" },
  live: { fr: "En direct", en: "Live" },
  finished: { fr: "Terminé", en: "Finished" },
  postponed: { fr: "Reporté", en: "Postponed" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
};

function teamName(
  team: TeamSnippet | null,
  placeholder: string | null,
  fr: boolean,
) {
  if (team) return fr ? team.name_fr : team.name_en;
  return placeholder ?? "?";
}

function isSameDay(iso: string, nowMs: number): boolean {
  if (nowMs === 0) return false;
  const d = new Date(iso);
  const n = new Date(nowMs);
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

/**
 * Admin match results — score-only, optimised for FAST live entry on a phone.
 * Defaults to the "to settle" view (live + kicked-off matches) so the admin
 * never hunts through 104 fixtures during a match; big +/- steppers and one-tap
 * status buttons make a score update a few taps. No scorers (nothing to mistype).
 */
export function MatchResultsAdmin({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Clock for classifying matches as "to settle" (live or already kicked off).
  // Lazy init = server time on first paint (authoritative, no render-time impurity);
  // refreshed each minute so a match that just started slides into the view itself.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hasLive = useMemo(() => matches.some((m) => m.status === "live"), [matches]);
  const [filter, setFilter] = useState<"attention" | "today" | "all">(
    hasLive ? "attention" : "all",
  );

  const attentionCount = useMemo(
    () => matches.filter((m) => isAwaitingResult(m, nowMs)).length,
    [matches, nowMs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...matches].sort(compareLiveThenKickoff);

    if (filter === "attention") list = list.filter((m) => isAwaitingResult(m, nowMs));
    else if (filter === "today") list = list.filter((m) => isSameDay(m.kickoff_at, nowMs));

    if (q) {
      list = list.filter((m) => {
        const h = teamName(m.home_team, m.home_placeholder, fr).toLowerCase();
        const a = teamName(m.away_team, m.away_placeholder, fr).toLowerCase();
        return (
          h.includes(q) ||
          a.includes(q) ||
          String(m.match_number ?? "").includes(q)
        );
      });
    }
    return list;
  }, [matches, query, filter, nowMs, fr]);

  const TABS: { key: typeof filter; label: string; badge?: number }[] = [
    { key: "attention", label: fr ? "À régler" : "To settle", badge: attentionCount },
    { key: "today", label: fr ? "Aujourd'hui" : "Today" },
    { key: "all", label: fr ? "Tous" : "All" },
  ];

  return (
    <div className="space-y-4">
      {/* Quick filter — defaults to what needs a result right now */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
              filter === t.key
                ? "bg-primary-500 text-abyss"
                : "border border-white/[0.1] bg-white/[0.03] text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  filter === t.key ? "bg-abyss/20 text-abyss" : "bg-error/20 text-error",
                )}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            fr ? "Filtrer par équipe ou n° de match…" : "Filter by team or match #…"
          }
          className="w-full rounded-[10px] border border-white/[0.1] bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      <ul className="space-y-1.5">
        {filtered.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            fr={fr}
            open={openId === m.id}
            onToggle={() => setOpenId((id) => (id === m.id ? null : m.id))}
          />
        ))}
        {filtered.length === 0 && (
          <li className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm text-text-tertiary">
            {filter === "attention"
              ? fr
                ? "Rien à régler pour l'instant — tout est à jour ✓"
                : "Nothing to settle right now — all caught up ✓"
              : fr
                ? "Aucun match."
                : "No matches."}
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * One match row + its inline score editor. Exported so the dashboard's
 * admin-only quick-results widget reuses the exact same fast editor (steppers,
 * one-tap status, auto-finish) instead of duplicating it.
 */
export function MatchRow({
  match,
  fr,
  open,
  onToggle,
}: {
  match: MatchListItem;
  fr: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const home = teamName(match.home_team, match.home_placeholder, fr);
  const away = teamName(match.away_team, match.away_placeholder, fr);
  const kickoff = new Date(match.kickoff_at).toLocaleDateString(
    fr ? "fr-CA" : "en-CA",
    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  );
  const hasScore = match.home_score != null && match.away_score != null;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-[10px] border bg-surface-1/[0.5]",
        match.status === "live"
          ? "border-error/30 ring-1 ring-error/20"
          : "border-white/[0.08]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.03]"
      >
        <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">
          #{match.match_number ?? "—"}
        </span>
        <span className="flex flex-1 items-center gap-2 truncate text-sm text-text-primary">
          <span className="truncate">
            {match.home_team?.flag_emoji} {home}
          </span>
          <span className="shrink-0 font-mono font-bold tabular-nums text-text-secondary">
            {hasScore ? `${match.home_score}–${match.away_score}` : "vs"}
          </span>
          <span className="truncate">
            {away} {match.away_team?.flag_emoji}
          </span>
        </span>
        <span className="hidden shrink-0 text-[11px] text-text-tertiary sm:inline">
          {kickoff}
        </span>
        <StatusBadge status={match.status} fr={fr} />
      </button>
      {open && <MatchEditor match={match} fr={fr} onDone={onToggle} />}
    </li>
  );
}

function StatusBadge({ status, fr }: { status: string; fr: boolean }) {
  const label = STATUS_LABEL[status]?.[fr ? "fr" : "en"] ?? status;
  const tone =
    status === "finished"
      ? "bg-primary-500/15 text-primary-300 ring-primary-500/30"
      : status === "live"
        ? "bg-error/15 text-error ring-error/30"
        : "bg-white/[0.05] text-text-tertiary ring-white/[0.1]";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function MatchEditor({
  match,
  fr,
  onDone,
}: {
  match: MatchListItem;
  fr: boolean;
  onDone: () => void;
}) {
  const isKO = match.stage !== "group";
  const [home, setHome] = useState(
    match.home_score != null ? String(match.home_score) : "",
  );
  const [away, setAway] = useState(
    match.away_score != null ? String(match.away_score) : "",
  );
  // Penalty shootout result — prefilled so re-saving a KO match never wipes the
  // winner that the shootout decided.
  const [homePen, setHomePen] = useState(
    match.home_pen != null ? String(match.home_pen) : "",
  );
  const [awayPen, setAwayPen] = useState(
    match.away_pen != null ? String(match.away_pen) : "",
  );
  const [status, setStatus] = useState<string>(match.status);
  const [isPending, start] = useTransition();
  const [isRecomputing, startRecompute] = useTransition();
  const router = useRouter();
  const toast = useToast();

  // Entering both scores on a still-"scheduled" match flips it to "finished" —
  // entering a final score means the match is over, and scoring only runs for
  // finished matches. Done in the change handlers (not an effect) to avoid
  // cascading renders.
  function changeHome(v: string) {
    setHome(v);
    if (v !== "" && away !== "" && status === "scheduled") setStatus("finished");
  }
  function changeAway(v: string) {
    setAway(v);
    if (home !== "" && v !== "" && status === "scheduled") setStatus("finished");
  }

  function save() {
    // C-5: a finished match must carry both scores. Otherwise the scoring engine
    // would award phantom points (total 0 → +5, NULL result → 'draw' → +3).
    if (status === "finished" && (home === "" || away === "")) {
      toast.error(
        fr
          ? "Un match terminé doit avoir les deux scores."
          : "A finished match needs both scores.",
      );
      return;
    }
    start(async () => {
      const res = await setMatchResultAction({
        matchId: match.id,
        homeScore: home === "" ? null : Number(home),
        awayScore: away === "" ? null : Number(away),
        status: status as (typeof STATUSES)[number],
        // Penalties only apply to knockout ties; group matches always send null.
        homePen: isKO && homePen !== "" ? Number(homePen) : null,
        awayPen: isKO && awayPen !== "" ? Number(awayPen) : null,
      });
      if (res.ok) {
        toast.success(fr ? "Résultat enregistré." : "Result saved.");
        router.refresh();
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  }

  function recompute() {
    const ok = window.confirm(
      fr
        ? "Recalculer les points de tous les pronostics de ce match avec le score actuel ?"
        : "Recompute every prediction's points for this match using the current score?",
    );
    if (!ok) return;
    startRecompute(async () => {
      const res = await recomputeMatchAction(match.id);
      if (res.ok) {
        toast.success(
          fr
            ? `Points recalculés (${res.count} pronostic${res.count > 1 ? "s" : ""}).`
            : `Points recomputed (${res.count} prediction${res.count > 1 ? "s" : ""}).`,
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4 border-t border-white/[0.08] bg-black/20 px-3.5 py-4">
      {/* Score steppers — big tap targets for fast mobile entry */}
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        <ScoreStepper
          label={teamName(match.home_team, match.home_placeholder, fr)}
          value={home}
          onChange={changeHome}
        />
        <span className="pb-3 text-2xl font-bold text-text-tertiary">–</span>
        <ScoreStepper
          label={teamName(match.away_team, match.away_placeholder, fr)}
          value={away}
          onChange={changeAway}
        />
      </div>

      {/* Status — one-tap buttons instead of a dropdown */}
      <div>
        <span className="mb-1.5 block text-center text-[11px] font-medium text-text-tertiary">
          {fr ? "Statut" : "Status"}
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {STATUSES.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold transition",
                  active
                    ? s === "live"
                      ? "bg-error text-white"
                      : s === "finished"
                        ? "bg-primary-500 text-abyss"
                        : "bg-surface-3 text-text-primary ring-1 ring-white/[0.15]"
                    : "border border-white/[0.1] bg-white/[0.02] text-text-tertiary hover:text-text-secondary",
                )}
              >
                {STATUS_LABEL[s][fr ? "fr" : "en"]}
              </button>
            );
          })}
        </div>
      </div>

      {isKO && (
        <div className="flex items-end justify-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-3 sm:gap-4">
          <ScoreStepper
            label={`${fr ? "Tab." : "Pens"} ${teamName(match.home_team, match.home_placeholder, fr)}`}
            value={homePen}
            onChange={setHomePen}
          />
          <span className="pb-3 text-2xl font-bold text-text-tertiary">–</span>
          <ScoreStepper
            label={`${fr ? "Tab." : "Pens"} ${teamName(match.away_team, match.away_placeholder, fr)}`}
            value={awayPen}
            onChange={setAwayPen}
          />
        </div>
      )}
      {isKO && (
        <p className="text-center text-[11px] leading-4 text-text-tertiary">
          {fr
            ? "Tirs au but — départage le vainqueur quand le score reste à égalité (phase finale)."
            : "Penalty shootout — decides the winner when the score stays level (knockouts)."}
        </p>
      )}

      {home !== "" && away !== "" && status !== "finished" && (
        <p className="rounded-sm border border-gold-500/30 bg-gold-500/[0.08] px-3 py-2 text-xs leading-5 text-gold-200">
          {fr
            ? "⚠️ Score saisi mais le match n'est pas « Terminé » → les points ne seront PAS attribués tant que le statut n'est pas « Terminé »."
            : "⚠️ Score entered but the match isn't Finished → points will NOT be awarded until the status is Finished."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {fr ? "Enregistrer" : "Save"}
        </button>
        {match.status === "finished" && (
          <button
            type="button"
            onClick={recompute}
            disabled={isRecomputing}
            className="inline-flex items-center gap-2 rounded-sm border border-white/[0.12] px-3 py-2.5 text-sm font-medium text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary disabled:opacity-60"
          >
            {isRecomputing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {fr ? "Recalculer" : "Recompute"}
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-sm px-3 py-2.5 text-sm text-text-secondary transition hover:text-text-primary"
        >
          {fr ? "Fermer" : "Close"}
        </button>
      </div>
      {status === "finished" && (
        <p className="text-[11px] text-text-tertiary">
          {fr
            ? "« Terminé » règle automatiquement les pronostics (et recalcule si tu corriges)."
            : "“Finished” settles predictions automatically (and recomputes on correction)."}
        </p>
      )}
    </div>
  );
}

function ScoreStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const n = value === "" ? 0 : Number(value);
  const set = (next: number) => onChange(String(Math.max(0, Math.min(99, next))));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="max-w-[6.5rem] truncate text-center text-[11px] font-medium text-text-tertiary">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => set(n - 1)}
          aria-label={`− ${label}`}
          className="flex size-11 items-center justify-center rounded-md border border-white/[0.12] bg-surface-2 text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary active:scale-95"
        >
          <Minus className="size-5" strokeWidth={2.4} />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          placeholder="0"
          aria-label={label}
          className="w-14 rounded-sm border border-white/[0.1] bg-surface-2 px-1 py-2 text-center text-2xl font-bold tabular-nums text-text-primary outline-none focus:border-primary-500"
        />
        <button
          type="button"
          onClick={() => set(n + 1)}
          aria-label={`+ ${label}`}
          className="flex size-11 items-center justify-center rounded-md border border-white/[0.12] bg-surface-2 text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
