import type { MatchListItem } from "@/lib/matches/queries";
import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { FollowMatchButton } from "@/components/match/follow-match-button";
import { picksToExisting } from "@/lib/bets/picks-to-existing";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import type { MyPick } from "@/lib/bets/my-picks";
import type { CommunityOdds } from "@/lib/bets/community-odds";

export function MatchCard({
  match,
  locale,
  myPicks,
  canBet = true,
  accessClosed = false,
  following,
  odds,
}: {
  match: MatchListItem;
  locale: Locale;
  myPicks?: MyPick[];
  /** When false, the bet-strip CTA becomes a paywall link to /buy-in. */
  canBet?: boolean;
  /** Buy-in sale is over (deadline passed) → no "buy my seat" CTA; the strip
      becomes a read-only recap of the player's pick. */
  accessClosed?: boolean;
  /** Undefined → no follow bell; boolean → show the bell in that state. */
  following?: boolean;
  /** Group consensus (% home/draw/away). Strip hidden when no picks yet. */
  odds?: CommunityOdds;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled";

  const kickoff = new Date(match.kickoff_at);
  const timeStr = kickoff.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });

  const homeWon =
    isFinished &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.home_score > match.away_score;
  const awayWon =
    isFinished &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.away_score > match.home_score;

  // Compact right-zone status: their result/pick, or a predict CTA.
  const activePred = predictedScore(myPicks);
  const settledWon = myPicks?.filter(
    (p) => p.status === "settled" && p.result === "won",
  ) ?? [];
  const wonPts = settledWon.reduce((s, p) => s + p.points, 0);
  const settledAny = myPicks?.some((p) => p.status === "settled") ?? false;
  const stage = stageShort(match.stage, match.group_label, locale);
  const fr = locale === "fr";

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-md border border-l-[3px] bg-surface-1/[0.6] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition",
        "border-white/[0.08] border-l-white/[0.12] hover:border-primary-500/35 hover:bg-surface-2/[0.78]",
        isFinished && "border-l-white/25",
        isLive &&
          "border-violet-500/45 border-l-violet-400 bg-gradient-to-br from-violet-500/[0.07] to-transparent",
      )}
    >
      <div className="flex items-stretch gap-3">
        {/* Time / status rail */}
        <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-1 border-r border-white/[0.07] pr-3 text-center">
          {isLive ? (
            <span className="flex flex-col items-center gap-0.5 text-violet-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-violet-400" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                Live
              </span>
            </span>
          ) : isFinished ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {fr ? "Fin" : "FT"}
            </span>
          ) : (
            <span className="font-mono text-[13px] font-bold tabular-nums text-text-primary">
              {timeStr}
            </span>
          )}
          <span className="w-full truncate text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
            {stage}
          </span>
        </div>

        {/* Teams */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <TeamLine
            team={match.home_team}
            placeholder={match.home_placeholder}
            score={match.home_score}
            showScore={isLive || isFinished}
            highlight={homeWon}
            locale={locale}
          />
          <TeamLine
            team={match.away_team}
            placeholder={match.away_placeholder}
            score={match.away_score}
            showScore={isLive || isFinished}
            highlight={awayWon}
            locale={locale}
          />
        </div>

        {/* Right — follow bell + pick status / CTA */}
        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
          {following !== undefined && (
            <FollowMatchButton
              matchId={match.id}
              initialFollowing={following}
              locale={locale}
              variant="icon"
            />
          )}
          {settledWon.length > 0 ? (
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-gold-300 ring-1 ring-inset ring-gold-500/30">
              +{wonPts}
            </span>
          ) : settledAny ? (
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
              {fr ? "Raté" : "Missed"}
            </span>
          ) : activePred ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-300 ring-1 ring-inset ring-primary-500/30">
              <Check className="size-3" strokeWidth={3} />
              {activePred.home}–{activePred.away}
            </span>
          ) : isScheduled ? (
            accessClosed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                <Lock className="size-2.5" strokeWidth={2.5} />
                {fr ? "Fermé" : "Closed"}
              </span>
            ) : (
              <QuickBetButton
                match={match}
                locale={locale}
                variant="icon"
                hasPick={false}
                existing={picksToExisting(myPicks)}
                canBet={canBet}
              />
            )
          ) : null}
        </div>
      </div>

      {/* Group consensus — condensed to a thin bar (full breakdown on the
         match page). Anti-cheat reveal dropped; hidden below sample size. */}
      <ConsensusBar odds={odds} locale={locale} />
    </Link>
  );
}

// Below this many picks we don't show a "group leans" bar — too few to read
// as a trend (matches the detail-page CommunityConsensus threshold so the two
// surfaces never disagree). Not anti-cheat: individual picks are public.
const CONSENSUS_MIN_SAMPLE = 3;

/** Ultra-thin group-consensus bar (home / draw / away). The full labelled
    breakdown lives on the match page — here it's a glanceable hint that keeps
    the card compact. */
function ConsensusBar({
  odds,
  locale,
}: {
  odds?: CommunityOdds;
  locale: Locale;
}) {
  if (!odds || odds.total < CONSENSUS_MIN_SAMPLE) return null;
  const fr = locale === "fr";
  // Independently-rounded shares can sum to 99/101 — absorb the drift into the
  // largest segment so the bar always totals 100.
  const shares = [odds.home, odds.draw, odds.away];
  const drift = 100 - (shares[0] + shares[1] + shares[2]);
  if (drift !== 0) {
    const maxIdx = shares.indexOf(Math.max(...shares));
    shares[maxIdx] += drift;
  }
  const segs = [
    { pct: shares[0], cls: "bg-primary-500/70" },
    { pct: shares[1], cls: "bg-white/25" },
    { pct: shares[2], cls: "bg-violet-500/70" },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        {segs.map((s, i) =>
          s.pct > 0 ? (
            <span key={i} className={s.cls} style={{ width: `${s.pct}%` }} aria-hidden />
          ) : null,
        )}
      </div>
      <span className="shrink-0 text-[9px] font-medium tabular-nums text-text-tertiary">
        {odds.total} {fr ? "pronos" : "picks"}
      </span>
    </div>
  );
}

/** The player's predicted score for a match, read from their validated picks. */
function predictedScore(
  picks: MyPick[] | undefined,
): { home: number; away: number } | null {
  if (!picks) return null;
  for (const p of picks) {
    if (p.status !== "validated") continue;
    const pl = p.payload as Record<string, unknown> | null;
    if (pl && typeof pl.home === "number" && typeof pl.away === "number") {
      return { home: pl.home, away: pl.away };
    }
  }
  return null;
}

function TeamLine({
  team,
  placeholder,
  score,
  showScore,
  highlight,
  locale,
}: {
  team: {
    iso_code?: string | null;
    name_fr: string;
    name_en: string;
    flag_emoji: string | null;
    fifa_code?: string;
  } | null;
  placeholder: string | null;
  score: number | null;
  showScore: boolean;
  highlight: boolean;
  locale: Locale;
}) {
  const name = team
    ? locale === "fr"
      ? team.name_fr
      : team.name_en
    : placeholder ?? "—";

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Flag isoCode={team?.iso_code ?? null} size="md" />
        <span
          className={cn(
            "truncate text-sm leading-tight",
            highlight
              ? "font-bold text-text-primary"
              : team
                ? "font-semibold text-text-primary"
                : "font-medium text-text-tertiary",
          )}
        >
          {name}
        </span>
      </div>
      {showScore && (
        <span
          className={cn(
            "font-display text-lg font-bold tabular-nums",
            highlight ? "text-primary-400" : "text-text-secondary",
          )}
        >
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}

/** Short stage tag for the compact time rail (fits ~44px): "Gr. K", "1/8"… */
function stageShort(
  stage: string,
  group: string | null,
  locale: Locale,
): string {
  if (stage === "group" && group) {
    return (locale === "fr" ? "Gr. " : "Grp ") + group;
  }
  const labels: Record<string, string> = {
    r32: "1/16",
    r16: "1/8",
    qf: "1/4",
    sf: "1/2",
    third_place: "3e",
    final: "F",
  };
  return labels[stage] ?? stage.toUpperCase();
}
