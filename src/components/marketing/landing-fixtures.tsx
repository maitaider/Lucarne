import { getLocale } from "next-intl/server";
import { listMatches, type MatchListItem } from "@/lib/matches/queries";
import { Flag } from "@/components/team/flag";
import { Countdown } from "./countdown";
import { CalendarClock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, { fr: string; en: string }> = {
  group: { fr: "Phase de groupes", en: "Group stage" },
  r32: { fr: "16ᵉˢ de finale", en: "Round of 32" },
  r16: { fr: "8ᵉˢ de finale", en: "Round of 16" },
  qf: { fr: "Quarts de finale", en: "Quarter-finals" },
  sf: { fr: "Demi-finales", en: "Semi-finals" },
  third_place: { fr: "3ᵉ place", en: "Third place" },
  final: { fr: "Finale", en: "Final" },
};

/**
 * Live pulse on the public landing — a countdown to the next kickoff plus the
 * two most recent results. Server component; the flags + timer are client
 * islands (Flag, Countdown). Reads the public `ref` schedule (anon has SELECT
 * on ref.matches / ref.teams) and degrades to nothing if it's empty or
 * unreachable, so the hero never breaks on the public page.
 */
export async function LandingFixtures() {
  const locale = await getLocale();
  const fr = locale === "fr";
  const matches = await listMatches();
  const now = Date.now();

  const nextMatch =
    matches.find((m) => new Date(m.kickoff_at).getTime() > now) ?? null;
  const lastResults = matches
    .filter(
      (m) =>
        m.status === "finished" &&
        m.home_score != null &&
        m.away_score != null,
    )
    .slice(-2)
    .reverse();

  if (!nextMatch && lastResults.length === 0) return null;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {nextMatch && (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-400">
              <CalendarClock className="size-3" strokeWidth={2} />
              {fr ? "Prochain match" : "Next match"}
            </span>
            <span className="inline-flex items-center gap-2 font-display text-base font-bold text-text-primary">
              <TeamTag team={nextMatch.home_team} />
              <span className="text-xs font-medium text-text-tertiary">vs</span>
              <TeamTag team={nextMatch.away_team} />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {STAGE_LABEL[nextMatch.stage]?.[fr ? "fr" : "en"] ?? ""}
              {nextMatch.group_label
                ? ` · ${fr ? "Gr." : "Grp"} ${nextMatch.group_label}`
                : ""}
            </span>
          </div>
          <Countdown targetIso={nextMatch.kickoff_at} />
        </div>
      )}

      {lastResults.length > 0 && (
        <div className="rounded-sm border border-white/[0.12] bg-abyss/[0.45] px-4 py-3 backdrop-blur">
          <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            <Trophy className="size-3 text-gold-400" strokeWidth={2} />
            {fr ? "Derniers résultats" : "Latest results"}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {lastResults.map((m) => (
              <ResultRow key={m.id} match={m} fr={fr} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamTag({ team }: { team: MatchListItem["home_team"] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Flag isoCode={team?.iso_code ?? null} size="sm" />
      <span>{team?.fifa_code ?? "?"}</span>
    </span>
  );
}

function ResultRow({ match, fr }: { match: MatchListItem; fr: boolean }) {
  const hs = match.home_score ?? 0;
  const as = match.away_score ?? 0;
  const pens =
    match.home_pen != null && match.away_pen != null
      ? `${match.home_pen}-${match.away_pen} ${fr ? "t.a.b." : "pens"}`
      : null;
  const homeWon =
    hs > as || (hs === as && (match.home_pen ?? 0) > (match.away_pen ?? 0));
  const awayWon =
    as > hs || (hs === as && (match.away_pen ?? 0) > (match.home_pen ?? 0));
  return (
    <div className="flex items-center justify-between gap-2 rounded-[4px] bg-white/[0.04] px-2.5 py-1.5">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Flag isoCode={match.home_team?.iso_code ?? null} size="xs" />
        <span
          className={cn(
            "font-mono text-xs",
            homeWon ? "font-bold text-text-primary" : "text-text-secondary",
          )}
        >
          {match.home_team?.fifa_code ?? "?"}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-center leading-none">
        <span className="font-display text-sm font-bold tabular-nums text-text-primary">
          {hs}
          <span className="mx-0.5 text-text-tertiary">-</span>
          {as}
        </span>
        {pens && (
          <span className="mt-0.5 text-[8px] uppercase tracking-wider text-text-tertiary">
            {pens}
          </span>
        )}
      </span>
      <span className="inline-flex min-w-0 items-center justify-end gap-1.5">
        <span
          className={cn(
            "font-mono text-xs",
            awayWon ? "font-bold text-text-primary" : "text-text-secondary",
          )}
        >
          {match.away_team?.fifa_code ?? "?"}
        </span>
        <Flag isoCode={match.away_team?.iso_code ?? null} size="xs" />
      </span>
    </div>
  );
}
