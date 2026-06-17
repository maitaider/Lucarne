import type { MatchListItem } from "@/lib/matches/queries";
import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { QuickBetButton } from "@/components/bet/quick-bet-button";
import { MyPickBadge } from "@/components/bet/my-pick-badge";
import { FollowMatchButton } from "@/components/match/follow-match-button";
import { picksToExisting } from "@/lib/bets/picks-to-existing";
import { Lock } from "lucide-react";
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
  hideDate = false,
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
  /** Calendar groups by day already, so the kickoff chip shows time only. */
  hideDate?: boolean;
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
  const dateStr = kickoff.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
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

  return (
    <div className="relative">
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-md border border-l-[3px] bg-surface-1/[0.68] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition",
        "border-white/[0.08] border-l-white/[0.12] hover:-translate-y-0.5 hover:border-primary-500/35 hover:bg-surface-2/[0.78] hover:shadow-[0_20px_60px_rgba(0,0,0,0.26)]",
        isFinished && "border-l-white/25",
        isLive && "border-violet-500/50 border-l-violet-400 bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] shadow-glow-violet",
      )}
    >
      {/* subtle accent ribbon for live */}
      {isLive && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
        />
      )}

      {/* Header */}
      <div
        className={cn(
          "mb-3 flex items-center justify-between gap-2",
          following !== undefined && "pr-8",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary ring-1 ring-inset ring-white/[0.06]">
            <StageLabel stage={match.stage} group={match.group_label} locale={locale} />
          </span>
          {match.venue && (
            <span className="truncate text-[11px] text-text-tertiary">
              {locale === "fr" ? match.venue.city_fr : match.venue.city_en}
            </span>
          )}
          {myPicks && myPicks.length > 0 && (
            <MyPickBadge picks={myPicks} locale={locale} size="xs" />
          )}
        </div>
        {isLive ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-violet-300">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
            </span>
            LIVE
          </span>
        ) : isFinished ? (
          <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {locale === "fr" ? "Terminé" : "Final"}
          </span>
        ) : (
          <span className="shrink-0 whitespace-nowrap rounded-md bg-white/[0.05] px-2 py-1 font-mono text-[13px] font-bold tabular-nums text-text-primary ring-1 ring-inset ring-white/[0.07]">
            {hideDate ? timeStr : `${dateStr} · ${timeStr}`}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2">
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

      {/* Group consensus — anonymous % of the pool, now shown on every card
         (anti-cheat reveal dropped). Hidden until at least one pick exists. */}
      <ConsensusStrip
        odds={odds}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        locale={locale}
      />

      {/* Bet CTA bottom strip (scheduled only, opens QuickBet sheet).
         Pre-fills with existing picks so user can edit instead of duplicating. */}
      {isScheduled &&
        (accessClosed ? (
          <ReadOnlyStrip predicted={predictedScore(myPicks)} locale={locale} />
        ) : (
          <QuickBetButton
            match={match}
            locale={locale}
            variant="strip"
            hasPick={myPicks?.some((p) => p.status === "validated") ?? false}
            existing={picksToExisting(myPicks)}
            canBet={canBet}
          />
        ))}
      </Link>
      {following !== undefined && (
        <div className="absolute right-2.5 top-2.5 z-20">
          <FollowMatchButton
            matchId={match.id}
            initialFollowing={following}
            locale={locale}
            variant="icon"
          />
        </div>
      )}
    </div>
  );
}

// Below this many picks we don't show a "group leans" bar — too few to read
// as a trend (matches the detail-page CommunityConsensus threshold so the two
// surfaces never disagree). Not anti-cheat: individual picks are public.
const CONSENSUS_MIN_SAMPLE = 3;

/** Compact 3-segment group-consensus bar (home win / draw / away win). */
function ConsensusStrip({
  odds,
  homeTeam,
  awayTeam,
  locale,
}: {
  odds?: CommunityOdds;
  homeTeam: { fifa_code?: string; name_fr: string; name_en: string } | null;
  awayTeam: { fifa_code?: string; name_fr: string; name_en: string } | null;
  locale: Locale;
}) {
  if (!odds || odds.total < CONSENSUS_MIN_SAMPLE) return null;
  const fr = locale === "fr";
  const homeCode = homeTeam?.fifa_code ?? (fr ? "DOM" : "HOME");
  const awayCode = awayTeam?.fifa_code ?? (fr ? "EXT" : "AWAY");

  // Independently-rounded shares can sum to 99/101 — absorb the drift into the
  // largest segment so the bar and legend always total 100.
  const shares = [odds.home, odds.draw, odds.away];
  const drift = 100 - (shares[0] + shares[1] + shares[2]);
  if (drift !== 0) {
    const maxIdx = shares.indexOf(Math.max(...shares));
    shares[maxIdx] += drift;
  }
  const [home, draw, away] = shares;

  const segs = [
    { pct: home, cls: "bg-primary-500/70" },
    { pct: draw, cls: "bg-white/25" },
    { pct: away, cls: "bg-violet-500/70" },
  ];

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
        <span className="min-w-0 truncate">{fr ? "Le groupe penche" : "Group leans"}</span>
        <span className="shrink-0 tabular-nums">
          {odds.total} {fr ? (odds.total === 1 ? "prono" : "pronos") : odds.total === 1 ? "pick" : "picks"}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        {segs.map((s, i) =>
          s.pct > 0 ? (
            <span
              key={i}
              className={s.cls}
              style={{ width: `${s.pct}%` }}
              aria-hidden
            />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] tabular-nums text-text-secondary">
        <span className="min-w-0 truncate font-semibold text-primary-300">
          {homeCode} {home}%
        </span>
        <span className={cn("shrink-0 text-text-tertiary", draw === 0 && "opacity-40")}>
          {fr ? "Nul" : "Draw"} {draw}%
        </span>
        <span className="min-w-0 truncate text-right font-semibold text-violet-300">
          {away}% {awayCode}
        </span>
      </div>
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

/**
 * Read-only footer strip shown once the buy-in sale is over. Replaces the
 * "buy my seat" CTA (no longer purchasable) with a useful recap: the player's
 * own prediction, or a plain read-only marker when they have no pick.
 */
function ReadOnlyStrip({
  predicted,
  locale,
}: {
  predicted: { home: number; away: number } | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
      <span className="flex items-center gap-1.5">
        <Lock className="size-3" strokeWidth={2.5} />
        {predicted
          ? fr
            ? "Ton prono"
            : "Your pick"
          : fr
            ? "Lecture seule"
            : "Read-only"}
      </span>
      {predicted && (
        <span className="font-display text-xs font-bold tabular-nums text-text-secondary">
          {predicted.home}–{predicted.away}
        </span>
      )}
    </div>
  );
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
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Flag isoCode={team?.iso_code ?? null} size="lg" />
        <span
          className={cn(
            "truncate text-[15px] leading-tight",
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
            "ml-2 font-display text-2xl font-semibold tabular-nums",
            highlight ? "text-primary-400" : "text-text-secondary",
          )}
        >
          {score ?? "—"}
        </span>
      )}
    </div>
  );
}

function StageLabel({
  stage,
  group,
  locale,
}: {
  stage: string;
  group: string | null;
  locale: Locale;
}) {
  if (stage === "group" && group) {
    return (
      <span className="font-semibold uppercase tracking-wider">
        {locale === "fr" ? "Groupe" : "Group"} {group}
      </span>
    );
  }
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e", en: "R32" },
    r16: { fr: "8e finale", en: "R16" },
    qf: { fr: "1/4 finale", en: "QF" },
    sf: { fr: "1/2 finale", en: "SF" },
    third_place: { fr: "3e place", en: "3rd place" },
    final: { fr: "Finale", en: "Final" },
  };
  return (
    <span className="font-semibold uppercase tracking-wider">
      {labels[stage]?.[locale] ?? stage}
    </span>
  );
}
