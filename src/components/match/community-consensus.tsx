import { getCommunityOdds } from "@/lib/bets/community-odds";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Aggregate "what the group thinks" for a match: % predicting a home win / draw
 * / away win, derived from everyone's active predictions (exact_score winners
 * included). Pure aggregate — no individual pick is revealed — so it can show
 * before kickoff, unlike <OthersPredictions> (nominative, gated to post-kickoff).
 *
 * Hidden below MIN_SAMPLE to avoid trivial inference in a small friends pool
 * (e.g. total = 1 would expose that one person's pick).
 */
const MIN_SAMPLE = 3;

export async function CommunityConsensus({
  matchId,
  homeName,
  awayName,
  locale,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const odds = (await getCommunityOdds([matchId])).get(matchId);
  const total = odds?.total ?? 0;

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <BarChart3 className="size-4 text-violet-400" strokeWidth={1.8} />
          {fr ? "Le groupe penche pour…" : "What the group thinks"}
        </h2>
        {total >= MIN_SAMPLE && (
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-text-tertiary">
            {total} {fr ? "pronos" : "picks"}
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        {total < MIN_SAMPLE ? (
          <p className="rounded-md border border-white/[0.07] bg-white/[0.02] px-4 py-4 text-center text-xs leading-5 text-text-tertiary">
            {fr
              ? "Pas encore assez de pronostics pour dégager une tendance du groupe."
              : "Not enough predictions yet to show a group trend."}
          </p>
        ) : (
          <ConsensusBars
            home={odds!.home}
            draw={odds!.draw}
            away={odds!.away}
            homeName={homeName}
            awayName={awayName}
            fr={fr}
          />
        )}
      </div>
    </section>
  );
}

function ConsensusBars({
  home,
  draw,
  away,
  homeName,
  awayName,
  fr,
}: {
  home: number;
  draw: number;
  away: number;
  homeName: string;
  awayName: string;
  fr: boolean;
}) {
  const drawLabel = fr ? "Nul" : "Draw";
  const lead = Math.max(home, draw, away);

  const segments = [
    { key: "home", label: homeName, pct: home, bar: "bg-primary-500", text: "text-primary-300" },
    { key: "draw", label: drawLabel, pct: draw, bar: "bg-text-tertiary", text: "text-text-secondary" },
    { key: "away", label: awayName, pct: away, bar: "bg-violet-500", text: "text-violet-300" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.04]"
        role="img"
        aria-label={
          fr
            ? `Consensus : ${home}% ${homeName}, ${draw}% nul, ${away}% ${awayName}`
            : `Consensus: ${home}% ${homeName}, ${draw}% draw, ${away}% ${awayName}`
        }
      >
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={cn("h-full transition-all", s.bar)}
              style={{ width: `${s.pct}%` }}
            />
          ) : null,
        )}
      </div>

      {/* Legend */}
      <ul className="grid grid-cols-3 gap-2">
        {segments.map((s) => (
          <li key={s.key} className="min-w-0 text-center">
            <div
              className={cn(
                "font-display text-xl font-bold tabular-nums",
                s.pct === lead ? s.text : "text-text-primary",
              )}
            >
              {s.pct}%
            </div>
            <div className="mt-0.5 truncate text-[11px] font-medium text-text-tertiary">
              {s.label}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
