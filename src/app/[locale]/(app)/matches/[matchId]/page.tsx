import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getMatchById, type MatchListItem } from "@/lib/matches/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { getTeamByCode, type WorldCupTeam } from "@/data/world-cup-2026";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  MessageCircle,
  Pencil,
  Target,
  Users,
} from "lucide-react";
import { CommentThread } from "@/components/social/comment-thread";
import { listComments } from "@/lib/social/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { Flag } from "@/components/team/flag";
import { TeamEmblem } from "@/components/team/team-emblem";
import { Reveal } from "@/components/ui/reveal";
import { LiveRefresh } from "@/components/live/live-refresh";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = locale === "fr";

  const match = await getMatchById(matchId);
  if (!match) notFound();

  const [comments, myPicks, currentUserId] = await Promise.all([
    listComments("match", matchId, 50),
    getMyPicksByMatch(),
    (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    })(),
  ]);

  // --- My prediction for this match (synced with /predict) -------------------
  const picks = myPicks.get(matchId) ?? [];
  const score = parseScore(picks.find((p) => p.bet_type === "exact_score")?.payload);
  const scorers = parseScorers(
    picks.find((p) => p.bet_type === "anytime_scorer")?.payload,
  );
  const hasPrediction = score !== null;

  const kickoff = new Date(match.kickoff_at);
  const locked =
    match.status !== "scheduled" ||
    kickoff.getTime() - 60 * 60 * 1000 < Date.now();

  const homeName = teamLabel(match.home_team, match.home_placeholder, L);
  const awayName = teamLabel(match.away_team, match.away_placeholder, L);
  const homeTeamData = match.home_team?.fifa_code
    ? getTeamByCode(match.home_team.fifa_code)
    : null;
  const awayTeamData = match.away_team?.fifa_code
    ? getTeamByCode(match.away_team.fifa_code)
    : null;
  const editHref = match.stage === "group" ? "/predict?tab=groupes" : "/predict?tab=finale";

  const dateLabel = kickoff.toLocaleDateString(fr ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = kickoff.toLocaleTimeString(fr ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
      <LiveRefresh intervalMs={30000} />
      <Link
        href="/matches"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        {fr ? "Tous les matchs" : "All matches"}
      </Link>

      {/* ── Match hero ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-[16px] border border-white/[0.1] bg-surface-1/[0.72] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_60%_at_50%_0%,rgba(34,217,130,0.10),transparent_62%)]"
        />

        {/* Top strip: stage + date/time (fills the header, no dead space) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.04] px-5 py-3 text-xs">
          <StageHeader match={match} locale={L} />
          <span className="inline-flex items-center gap-3 font-mono tabular-nums text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 text-text-tertiary" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-text-tertiary" />
              {timeLabel}
            </span>
          </span>
        </div>

        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-8 sm:gap-6 sm:px-8 sm:py-10">
          <TeamColumn team={match.home_team} name={homeName} align="right" />
          <CenterScore
            match={match}
            score={score}
            hasPrediction={hasPrediction}
            locale={L}
          />
          <TeamColumn team={match.away_team} name={awayName} align="left" />
        </div>

        {match.venue && (
          <div className="flex items-center gap-1.5 border-t border-white/[0.08] bg-white/[0.035] px-5 py-2.5 text-xs text-text-secondary">
            <MapPin className="size-3.5 text-text-tertiary" />
            {match.venue.name}
            <span className="text-text-tertiary">
              · {fr ? match.venue.city_fr : match.venue.city_en}
            </span>
          </div>
        )}
      </section>

      {/* ── My prediction (synced) ─────────────────────────────────────── */}
      <Reveal className="mt-6">
        <MyPredictionPanel
          homeName={homeName}
          awayName={awayName}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          score={score}
          scorers={scorers}
          locked={locked}
          editHref={editHref}
          locale={L}
        />
      </Reveal>

      {/* ── Players to watch ───────────────────────────────────────────── */}
      {(homeTeamData || awayTeamData) && (
        <Reveal className="mt-6" delayMs={80}>
          <section className="grid gap-4 md:grid-cols-2">
            {homeTeamData && (
              <TeamWatchlist
                team={homeTeamData}
                isoCode={match.home_team?.iso_code ?? null}
                locale={L}
              />
            )}
            {awayTeamData && (
              <TeamWatchlist
                team={awayTeamData}
                isoCode={match.away_team?.iso_code ?? null}
                locale={L}
              />
            )}
          </section>
        </Reveal>
      )}

      {/* ── Discussion ─────────────────────────────────────────────────── */}
      <section className="mt-8">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
            <MessageCircle className="size-5 text-primary-400" strokeWidth={1.7} />
            {fr ? "Discussion" : "Discussion"}
            <span className="text-sm font-medium text-text-tertiary">
              · {comments.length}
            </span>
          </h2>
        </header>
        <CommentThread
          parentType="match"
          parentId={match.id}
          comments={comments}
          currentUserId={currentUserId}
          locale={L}
          emptyLabel={
            fr
              ? "Sois le premier à donner ton pronostic en mots."
              : "Be the first to weigh in on this match."
          }
        />
      </section>
    </main>
  );
}

/* ─────────────────────────── Hero pieces ─────────────────────────────── */

function TeamColumn({
  team,
  name,
  align,
}: {
  team: MatchListItem["home_team"];
  name: string;
  align: "left" | "right";
}) {
  const right = align === "right";
  const inner = (
    <>
      <Flag
        isoCode={team?.iso_code ?? null}
        size="2xl"
        className="!h-14 !w-20 rounded-[8px] ring-1 ring-white/15 transition group-hover:ring-primary-500/40 sm:!h-16 sm:!w-24"
      />
      <div className={right ? "text-right" : "text-left"}>
        <div className="truncate font-display text-lg font-semibold text-text-primary transition group-hover:text-primary-200 sm:text-2xl">
          {name}
        </div>
        {team?.fifa_code && (
          <div className="font-mono text-[11px] uppercase tracking-wider text-text-tertiary">
            {team.fifa_code}
          </div>
        )}
      </div>
    </>
  );
  const cls = cnAlign(right, "flex min-w-0 flex-col gap-3");

  return team?.fifa_code ? (
    <Link href={`/teams/${team.fifa_code}`} className={`group ${cls}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function CenterScore({
  match,
  score,
  hasPrediction,
  locale,
}: {
  match: MatchListItem;
  score: { home: number; away: number } | null;
  hasPrediction: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";

  // Real score takes precedence once the match is live/finished.
  if (match.status === "live" || match.status === "finished") {
    const live = match.status === "live";
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 font-display text-5xl font-semibold tabular-nums sm:text-6xl">
          <span className={live ? "text-primary-500" : "text-text-primary"}>
            {match.home_score ?? 0}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className={live ? "text-primary-500" : "text-text-primary"}>
            {match.away_score ?? 0}
          </span>
        </div>
        <span
          className={
            live
              ? "inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400"
              : "text-[10px] font-bold uppercase tracking-wider text-text-tertiary"
          }
        >
          {live && (
            <span className="size-1.5 animate-pulse rounded-full bg-violet-400" />
          )}
          {live ? "LIVE" : fr ? "Terminé" : "Final"}
        </span>
      </div>
    );
  }

  // Upcoming: surface the user's predicted scoreline in the middle.
  if (hasPrediction && score) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
          {fr ? "Ton prono" : "Your pick"}
        </span>
        <div className="flex items-center gap-2.5 font-display text-5xl font-semibold tabular-nums text-text-primary sm:text-6xl">
          <span>{score.home}</span>
          <span className="text-text-tertiary">–</span>
          <span>{score.away}</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {fr ? "Coup d'envoi à venir" : "Kickoff upcoming"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-display text-3xl font-semibold text-text-tertiary sm:text-5xl">
        VS
      </span>
      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-text-tertiary">
        {fr ? "Pas encore de prono" : "No pick yet"}
      </span>
    </div>
  );
}

/* ───────────────────────── My prediction panel ───────────────────────── */

function MyPredictionPanel({
  homeName,
  awayName,
  homeTeam,
  awayTeam,
  score,
  scorers,
  locked,
  editHref,
  locale,
}: {
  homeName: string;
  awayName: string;
  homeTeam: MatchListItem["home_team"];
  awayTeam: MatchListItem["away_team"];
  score: { home: number; away: number } | null;
  scorers: string[];
  locked: boolean;
  editHref: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const hasPrediction = score !== null;

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <Target className="size-4 text-primary-400" strokeWidth={1.8} />
          {fr ? "Mon pronostic" : "My prediction"}
        </h2>
        {hasPrediction && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/25">
            <CheckCircle2 className="size-3" strokeWidth={2.5} />
            {fr ? "Placé" : "Placed"}
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        {hasPrediction && score ? (
          <div className="space-y-4">
            {/* Predicted scoreline with flags */}
            <div className="flex items-center justify-center gap-4 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <Flag isoCode={homeTeam?.iso_code ?? null} size="md" />
                <span className="truncate text-sm font-semibold text-text-secondary">
                  {homeName}
                </span>
              </div>
              <div className="flex items-center gap-2 font-display text-3xl font-bold tabular-nums text-text-primary">
                <span>{score.home}</span>
                <span className="text-text-tertiary">–</span>
                <span>{score.away}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-text-secondary">
                  {awayName}
                </span>
                <Flag isoCode={awayTeam?.iso_code ?? null} size="md" />
              </div>
            </div>

            {/* Scorers */}
            {scorers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
                  <Users className="size-3 text-violet-300" strokeWidth={2} />
                  {fr ? "Buteurs" : "Scorers"}
                </span>
                {scorers.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-violet-500/12 px-2.5 py-1 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/25"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            {!locked ? (
              <Link
                href={editHref}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.14] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary-500/45 hover:bg-primary-500/[0.1] active:scale-[0.99]"
              >
                <Pencil className="size-4" strokeWidth={1.8} />
                {fr ? "Modifier mon pronostic" : "Edit my prediction"}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <p className="rounded-[10px] border border-warning/30 bg-warning/10 px-4 py-3 text-center text-xs font-medium text-warning">
                {fr
                  ? "Pronostics fermés — le coup d'envoi approche."
                  : "Predictions closed — kickoff is near."}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-text-secondary">
              {locked
                ? fr
                  ? "Tu n'as pas pronostiqué ce match et les paris sont fermés."
                  : "You didn't predict this match and betting is closed."
                : fr
                  ? "Tu n'as pas encore pronostiqué ce match."
                  : "You haven't predicted this match yet."}
            </p>
            {!locked && (
              <Link
                href={editHref}
                className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-primary-500 px-6 py-3 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99]"
              >
                <Target className="size-4" strokeWidth={2} />
                {fr ? "Pronostiquer ce match" : "Predict this match"}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────── Watchlist ─────────────────────────────── */

function TeamWatchlist({
  team,
  isoCode,
  locale,
}: {
  team: WorldCupTeam;
  isoCode: string | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.62] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        {isoCode ? (
          <Flag isoCode={isoCode} size="lg" className="ring-1 ring-white/15" />
        ) : (
          <TeamEmblem code={team.fifa_code} name={team.name_fr} size="lg" />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold text-text-primary">
            {fr ? team.name_fr : team.name_en}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            {fr ? "Joueurs à suivre" : "Players to watch"} · {fr ? "Groupe" : "Group"}{" "}
            {team.group_label}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {team.key_players.map((player, index) => (
          <div
            key={player}
            className="grid grid-cols-[2rem_1fr] items-center gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.035] px-3 py-2"
          >
            <span className="flex size-7 items-center justify-center rounded-[7px] bg-gold-500/[0.1] font-mono text-xs font-bold text-gold-400 ring-1 ring-gold-500/25">
              {index + 1}
            </span>
            <span className="truncate text-sm font-semibold text-text-primary">
              {player}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-text-tertiary">
        {fr
          ? "Watchlist éditoriale; les listes finales FIFA sont attendues le 2 juin 2026."
          : "Editorial watchlist; FIFA final rosters are due on June 2, 2026."}
      </p>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────────── */

function StageHeader({ match, locale }: { match: MatchListItem; locale: Locale }) {
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e de finale", en: "Round of 32" },
    r16: { fr: "8e de finale", en: "Round of 16" },
    qf: { fr: "Quart de finale", en: "Quarter-final" },
    sf: { fr: "Demi-finale", en: "Semi-final" },
    third_place: { fr: "Match pour la 3e place", en: "Third-place playoff" },
    final: { fr: "Finale", en: "Final" },
  };
  const label =
    match.stage === "group" && match.group_label
      ? `${locale === "fr" ? "Groupe" : "Group"} ${match.group_label}`
      : (labels[match.stage]?.[locale] ?? match.stage);
  return (
    <span className="font-semibold uppercase tracking-wider text-text-tertiary">
      {label} · Match #{match.match_number}
    </span>
  );
}

function teamLabel(
  team: { name_fr: string; name_en: string } | null,
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? "—";
}

function cnAlign(right: boolean, base: string): string {
  return `${base} ${right ? "items-end" : "items-start"}`;
}

function parseScore(payload: unknown): { home: number; away: number } | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.home === "number" && typeof p.away === "number") {
      return { home: p.home, away: p.away };
    }
  }
  return null;
}

function parseScorers(payload: unknown): string[] {
  if (payload && typeof payload === "object") {
    const players = (payload as Record<string, unknown>).players;
    if (Array.isArray(players)) {
      return players
        .map((p) =>
          p && typeof p === "object"
            ? String((p as Record<string, unknown>).player_name ?? "")
            : "",
        )
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
  }
  return [];
}
