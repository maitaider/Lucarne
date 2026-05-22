import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getMatchById, type MatchListItem } from "@/lib/matches/queries";
import { getTeamByCode, type WorldCupTeam } from "@/data/world-cup-2026";
import { ArrowLeft, MapPin, Clock, Calendar, MessageCircle } from "lucide-react";
import { BetForm } from "@/components/bet/bet-form";
import { CommentThread } from "@/components/social/comment-thread";
import { listComments } from "@/lib/social/queries";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { TeamEmblem } from "@/components/team/team-emblem";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  setRequestLocale(locale);

  const match = await getMatchById(matchId);
  if (!match) notFound();

  const [comments, currentUserId] = await Promise.all([
    listComments("match", matchId, 50),
    (async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
      const supabase = await getSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    })(),
  ]);

  const kickoff = new Date(match.kickoff_at);
  const now = new Date();
  const lockTime = new Date(kickoff.getTime() - 60_000); // T-60s
  const isLocked = now >= lockTime;

  const homeName = teamLabel(match.home_team, match.home_placeholder, locale as Locale);
  const awayName = teamLabel(match.away_team, match.away_placeholder, locale as Locale);
  const homeTeamData = match.home_team?.fifa_code
    ? getTeamByCode(match.home_team.fifa_code)
    : null;
  const awayTeamData = match.away_team?.fifa_code
    ? getTeamByCode(match.away_team.fifa_code)
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <Link
        href="/matches"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        {locale === "fr" ? "Tous les matchs" : "All matches"}
      </Link>

      {/* Match header */}
      <section className="overflow-hidden rounded-[8px] border border-white/[0.1] bg-surface-1/[0.72] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="border-b border-white/[0.08] bg-white/[0.045] px-6 py-3 text-xs text-text-tertiary">
          <StageHeader match={match} locale={locale as Locale} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-10 sm:py-14">
          <TeamBlock
            team={match.home_team}
            placeholder={match.home_placeholder}
            name={homeName}
            align="right"
          />
          <ScoreBlock match={match} isLocked={isLocked} locale={locale as Locale} />
          <TeamBlock
            team={match.away_team}
            placeholder={match.away_placeholder}
            name={awayName}
            align="left"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.08] bg-white/[0.035] px-6 py-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {kickoff.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {kickoff.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Paris",
            })}
          </span>
          {match.venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {match.venue.name}
              <span className="text-text-tertiary">
                · {locale === "fr" ? match.venue.city_fr : match.venue.city_en}
              </span>
            </span>
          )}
        </div>
      </section>

      {(homeTeamData || awayTeamData) && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {homeTeamData && <TeamWatchlist team={homeTeamData} locale={locale as Locale} />}
          {awayTeamData && <TeamWatchlist team={awayTeamData} locale={locale as Locale} />}
        </section>
      )}

      {/* Bet form */}
      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-semibold text-text-primary">
          {locale === "fr" ? "Place ton pari" : "Place your bet"}
        </h2>
        {isLocked ? (
          <div className="rounded-[8px] border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
            {locale === "fr"
              ? "Paris fermés — le match a commencé."
              : "Bets closed — kickoff has passed."}
          </div>
        ) : (
          <BetForm
            matchId={match.id}
            homeName={homeName}
            awayName={awayName}
            kickoffAt={match.kickoff_at}
            locale={locale as Locale}
          />
        )}
      </section>

      {/* Comments thread — social interaction zone */}
      <section className="mt-10">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-text-primary">
            <MessageCircle className="size-5 text-primary-400" strokeWidth={1.7} />
            {locale === "fr" ? "Discussion" : "Discussion"}
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
          locale={locale as Locale}
          emptyLabel={
            locale === "fr"
              ? "Sois le premier à donner ton pronostic en mots."
              : "Be the first to weigh in on this match."
          }
        />
      </section>
    </main>
  );
}

function TeamWatchlist({ team, locale }: { team: WorldCupTeam; locale: Locale }) {
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.62] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <TeamEmblem code={team.fifa_code} name={team.name_fr} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold text-text-primary">
            {locale === "fr" ? team.name_fr : team.name_en}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            {locale === "fr" ? "Joueurs à suivre" : "Players to watch"} · Groupe{" "}
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
            <span className="truncate text-sm font-semibold text-text-primary">{player}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-text-tertiary">
        {locale === "fr"
          ? "Watchlist éditoriale; les listes finales FIFA sont attendues le 2 juin 2026."
          : "Editorial watchlist; FIFA final rosters are due on June 2, 2026."}
      </p>
    </div>
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

function TeamBlock({
  team,
  name,
  align,
}: {
  team: MatchListItem["home_team"];
  placeholder: string | null;
  name: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={
        align === "right" ? "flex flex-col items-end gap-3" : "flex flex-col items-start gap-3"
      }
    >
      <TeamEmblem code={team?.fifa_code} name={name} size="2xl" />
      <div className={align === "right" ? "text-right" : "text-left"}>
        <div className="font-display text-xl font-semibold text-text-primary sm:text-2xl">
          {name}
        </div>
        {team?.fifa_code && (
          <div className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            {team.fifa_code}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBlock({
  match,
  isLocked,
  locale,
}: {
  match: MatchListItem;
  isLocked: boolean;
  locale: Locale;
}) {
  if (match.status === "live") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3 font-display text-5xl font-semibold tabular-nums sm:text-6xl">
          <span className="text-primary-500">{match.home_score ?? 0}</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-primary-500">{match.away_score ?? 0}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
          <span className="size-1.5 animate-pulse rounded-full bg-violet-400" />
          LIVE
        </span>
      </div>
    );
  }
  if (match.status === "finished") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3 font-display text-5xl font-semibold tabular-nums text-text-primary sm:text-6xl">
          <span>{match.home_score}</span>
          <span className="text-text-tertiary">·</span>
          <span>{match.away_score}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "Terminé" : "Final"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-3xl font-semibold text-text-tertiary sm:text-5xl">
        VS
      </span>
      {!isLocked && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {locale === "fr" ? "À venir" : "Upcoming"}
        </span>
      )}
    </div>
  );
}

function StageHeader({ match, locale }: { match: MatchListItem; locale: Locale }) {
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e de finale", en: "Round of 32" },
    r16: { fr: "8e de finale", en: "Round of 16" },
    qf: { fr: "Quart de finale", en: "Quarter-final" },
    sf: { fr: "Demi-finale", en: "Semi-final" },
    third_place: { fr: "Match pour la 3e place", en: "Third-place playoff" },
    final: { fr: "Finale", en: "Final" },
  };
  if (match.stage === "group" && match.group_label) {
    return (
      <span className="font-semibold uppercase tracking-wider">
        {locale === "fr" ? "Groupe" : "Group"} {match.group_label} · Match #
        {match.match_number}
      </span>
    );
  }
  return (
    <span className="font-semibold uppercase tracking-wider">
      {labels[match.stage]?.[locale] ?? match.stage} · Match #{match.match_number}
    </span>
  );
}
