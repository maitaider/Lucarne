"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import {
  setMatchResultAction,
  recomputeMatchAction,
} from "@/lib/matches/admin-actions";
import type { MatchListItem, TeamSnippet } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Goal, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

type EventType = "goal" | "penalty_goal" | "own_goal";
type Scorer = {
  player_name: string;
  team_id: string | null;
  minute: string;
  event_type: EventType;
};

/** Pre-fill shape passed from the server (existing match_events). */
export type ExistingScorer = Scorer;

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

export function MatchResultsAdmin({
  matches,
  scorersByMatch = {},
  rosterByTeam = {},
  locale,
}: {
  matches: MatchListItem[];
  scorersByMatch?: Record<string, ExistingScorer[]>;
  rosterByTeam?: Record<string, string[]>;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...matches].sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    );
    if (!q) return sorted;
    return sorted.filter((m) => {
      const h = teamName(m.home_team, m.home_placeholder, fr).toLowerCase();
      const a = teamName(m.away_team, m.away_placeholder, fr).toLowerCase();
      return (
        h.includes(q) ||
        a.includes(q) ||
        String(m.match_number ?? "").includes(q)
      );
    });
  }, [matches, query, fr]);

  return (
    <div className="space-y-4">
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
            existingScorers={scorersByMatch[m.id] ?? []}
            homeRoster={m.home_team?.id ? rosterByTeam[m.home_team.id] ?? [] : []}
            awayRoster={m.away_team?.id ? rosterByTeam[m.away_team.id] ?? [] : []}
          />
        ))}
        {filtered.length === 0 && (
          <li className="rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm text-text-tertiary">
            {fr ? "Aucun match." : "No matches."}
          </li>
        )}
      </ul>
    </div>
  );
}

function MatchRow({
  match,
  fr,
  open,
  onToggle,
  existingScorers,
  homeRoster,
  awayRoster,
}: {
  match: MatchListItem;
  fr: boolean;
  open: boolean;
  onToggle: () => void;
  existingScorers: Scorer[];
  homeRoster: string[];
  awayRoster: string[];
}) {
  const home = teamName(match.home_team, match.home_placeholder, fr);
  const away = teamName(match.away_team, match.away_placeholder, fr);
  const kickoff = new Date(match.kickoff_at).toLocaleDateString(
    fr ? "fr-CA" : "en-CA",
    { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  );
  const hasScore = match.home_score != null && match.away_score != null;

  return (
    <li className="overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5]">
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
      {open && (
        <MatchEditor
          match={match}
          fr={fr}
          onDone={onToggle}
          initialScorers={existingScorers}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
        />
      )}
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
  initialScorers,
  homeRoster,
  awayRoster,
}: {
  match: MatchListItem;
  fr: boolean;
  onDone: () => void;
  initialScorers: Scorer[];
  homeRoster: string[];
  awayRoster: string[];
}) {
  const [home, setHome] = useState(
    match.home_score != null ? String(match.home_score) : "",
  );
  const [away, setAway] = useState(
    match.away_score != null ? String(match.away_score) : "",
  );
  const [status, setStatus] = useState<string>(match.status);
  // Pre-fill from existing match_events so re-saving never wipes scorers.
  const [scorers, setScorers] = useState<Scorer[]>(() =>
    initialScorers.map((s) => ({ ...s })),
  );
  const [isPending, start] = useTransition();
  const [isRecomputing, startRecompute] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const rosterListId = `roster-${match.id}`;
  const rosterNames = useMemo(
    () => Array.from(new Set([...homeRoster, ...awayRoster])).sort(),
    [homeRoster, awayRoster],
  );

  const teams = [
    { id: match.home_team?.id ?? null, label: teamName(match.home_team, match.home_placeholder, fr) },
    { id: match.away_team?.id ?? null, label: teamName(match.away_team, match.away_placeholder, fr) },
  ];

  function addScorer() {
    setScorers((s) => [
      ...s,
      { player_name: "", team_id: teams[0]?.id ?? null, minute: "", event_type: "goal" },
    ]);
  }
  function updateScorer(i: number, patch: Partial<Scorer>) {
    setScorers((s) => s.map((sc, idx) => (idx === i ? { ...sc, ...patch } : sc)));
  }
  function removeScorer(i: number) {
    setScorers((s) => s.filter((_, idx) => idx !== i));
  }

  function save() {
    start(async () => {
      const res = await setMatchResultAction({
        matchId: match.id,
        homeScore: home === "" ? null : Number(home),
        awayScore: away === "" ? null : Number(away),
        status: status as (typeof STATUSES)[number],
        scorers: scorers
          .filter((s) => s.player_name.trim())
          .map((s) => ({
            player_name: s.player_name.trim(),
            team_id: s.team_id,
            minute: s.minute === "" ? null : Number(s.minute),
            event_type: s.event_type,
          })),
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
        ? "Recalculer les points de tous les pronostics de ce match avec le score et les buteurs actuels ?"
        : "Recompute every prediction's points for this match using the current score and scorers?",
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
      <div className="flex flex-wrap items-end gap-3">
        <ScoreInput
          label={teamName(match.home_team, match.home_placeholder, fr)}
          value={home}
          onChange={setHome}
        />
        <span className="pb-2 text-lg font-bold text-text-tertiary">–</span>
        <ScoreInput
          label={teamName(match.away_team, match.away_placeholder, fr)}
          value={away}
          onChange={setAway}
        />
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-tertiary">
            {fr ? "Statut" : "Status"}
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-sm border border-white/[0.1] bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-primary-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s][fr ? "fr" : "en"]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Scorers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <Goal className="size-3.5" /> {fr ? "Buteurs" : "Scorers"}
          </span>
          <button
            type="button"
            onClick={addScorer}
            className="flex items-center gap-1 rounded-[7px] border border-white/[0.12] px-2 py-1 text-[11px] font-medium text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary"
          >
            <Plus className="size-3" /> {fr ? "Ajouter" : "Add"}
          </button>
        </div>
        {rosterNames.length > 0 && (
          <datalist id={rosterListId}>
            {rosterNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        )}
        {scorers.map((s, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={s.player_name}
              onChange={(e) => updateScorer(i, { player_name: e.target.value })}
              placeholder={fr ? "Nom du buteur" : "Scorer name"}
              list={rosterNames.length > 0 ? rosterListId : undefined}
              className="min-w-[8rem] flex-1 rounded-[7px] border border-white/[0.1] bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-primary-500"
            />
            <select
              value={s.team_id ?? ""}
              onChange={(e) => updateScorer(i, { team_id: e.target.value || null })}
              className="rounded-[7px] border border-white/[0.1] bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-primary-500"
            >
              {teams.map((t) => (
                <option key={t.id ?? "none"} value={t.id ?? ""}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={s.minute}
              onChange={(e) =>
                updateScorer(i, { minute: e.target.value.replace(/\D/g, "") })
              }
              placeholder="'"
              inputMode="numeric"
              className="w-14 rounded-[7px] border border-white/[0.1] bg-surface-2 px-2 py-1.5 text-center text-sm text-text-primary outline-none focus:border-primary-500"
            />
            <select
              value={s.event_type}
              onChange={(e) =>
                updateScorer(i, { event_type: e.target.value as EventType })
              }
              className="rounded-[7px] border border-white/[0.1] bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-primary-500"
            >
              <option value="goal">{fr ? "But" : "Goal"}</option>
              <option value="penalty_goal">{fr ? "Pénalty" : "Penalty"}</option>
              <option value="own_goal">{fr ? "C.S.C." : "Own goal"}</option>
            </select>
            <button
              type="button"
              onClick={() => removeScorer(i)}
              className="rounded-[7px] p-1.5 text-text-tertiary transition hover:bg-error/10 hover:text-error"
              aria-label={fr ? "Retirer" : "Remove"}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {fr ? "Enregistrer le résultat" : "Save result"}
        </button>
        {match.status === "finished" && (
          <button
            type="button"
            onClick={recompute}
            disabled={isRecomputing}
            className="inline-flex items-center gap-2 rounded-sm border border-white/[0.12] px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-primary-500/40 hover:text-text-primary disabled:opacity-60"
          >
            {isRecomputing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {fr ? "Recalculer les points" : "Recompute points"}
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-sm px-3 py-2 text-sm text-text-secondary transition hover:text-text-primary"
        >
          {fr ? "Fermer" : "Close"}
        </button>
        {status === "finished" && (
          <span className="text-[11px] text-text-tertiary">
            {fr
              ? "« Terminé » règle automatiquement les pronostics (et recalcule si tu corriges)."
              : "“Finished” settles predictions automatically (and recomputes on correction)."}
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="max-w-[7rem] truncate text-[11px] font-medium text-text-tertiary">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        placeholder="0"
        className="w-16 rounded-sm border border-white/[0.1] bg-surface-2 px-2.5 py-2 text-center text-lg font-bold tabular-nums text-text-primary outline-none focus:border-primary-500"
      />
    </label>
  );
}
