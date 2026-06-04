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
import { Loader2, RefreshCw, Search } from "lucide-react";

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

/**
 * Admin match results — score-only scoring. The admin enters just the final
 * score + status (and, for a level knockout tie, the penalty shootout). No
 * scorers: nothing to type by hand → nothing to mistype.
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
      <div className="flex flex-wrap items-end gap-3">
        <ScoreInput
          label={teamName(match.home_team, match.home_placeholder, fr)}
          value={home}
          onChange={changeHome}
        />
        <span className="pb-2 text-lg font-bold text-text-tertiary">–</span>
        <ScoreInput
          label={teamName(match.away_team, match.away_placeholder, fr)}
          value={away}
          onChange={changeAway}
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

      {isKO && (
        <div className="flex flex-wrap items-end gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-3">
          <ScoreInput
            label={`${fr ? "Tab." : "Pens"} ${teamName(match.home_team, match.home_placeholder, fr)}`}
            value={homePen}
            onChange={setHomePen}
          />
          <span className="pb-2 text-lg font-bold text-text-tertiary">–</span>
          <ScoreInput
            label={`${fr ? "Tab." : "Pens"} ${teamName(match.away_team, match.away_placeholder, fr)}`}
            value={awayPen}
            onChange={setAwayPen}
          />
          <p className="max-w-[18rem] pb-1 text-[11px] leading-4 text-text-tertiary">
            {fr
              ? "Tirs au but — départage le vainqueur quand le score reste à égalité (phase finale)."
              : "Penalty shootout — decides the winner when the score stays level (knockouts)."}
          </p>
        </div>
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
