import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { EmptyStateVisual } from "@/components/layout/empty-state-visual";
import type { MatchListItem } from "@/lib/matches/queries";
import type { StandingEntry } from "@/lib/leagues/queries";
import {
  ArrowRight,
  CalendarClock,
  Crown,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Replaces the old "Cockpit" component. Shows the user what's happening
 * RIGHT NOW + their position in the pool, all on one focused panel:
 *
 *   1. Featured match (live with score if any, else next openable)
 *   2. Next 3 matches (compact rows)
 *   3. Top 5 leaderboard with the user's own rank surfaced
 *
 * Server component — pure rendering off props.
 */
export function TodayPanel({
  matches,
  standings,
  currentUserId,
  locale,
}: {
  matches: MatchListItem[];
  standings: StandingEntry[];
  currentUserId: string | null;
  locale: Locale;
}) {
  const now = Date.now();

  // Featured: live match first, then next scheduled match (>1h kickoff buffer).
  const liveMatch = matches.find((m) => m.status === "live") ?? null;
  const nextMatch = matches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        new Date(m.kickoff_at).getTime() - now > 60 * 60_000,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    )[0];
  const featured = liveMatch ?? nextMatch ?? null;

  // Next 3 (skip the featured one, sort by kickoff).
  const upcomingList = matches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        m.id !== featured?.id &&
        new Date(m.kickoff_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime(),
    )
    .slice(0, 3);

  const top5 = standings.slice(0, 5);
  const myRow = currentUserId
    ? standings.find((s) => s.user_id === currentUserId)
    : null;
  const showMyRowSeparately =
    myRow && top5.every((r) => r.user_id !== myRow.user_id);

  return (
    <section className="flex flex-col gap-3">
      <FeaturedCard match={featured} locale={locale} />

      <UpcomingCard
        matches={upcomingList}
        anyToday={hasMatchesToday(matches, now)}
        locale={locale}
      />

      <LeaderboardCard
        top5={top5}
        myRow={showMyRowSeparately ? myRow ?? null : null}
        currentUserId={currentUserId}
        totalPlayers={standings.length}
        locale={locale}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Featured card (live or next match)                                        */
/* -------------------------------------------------------------------------- */

function FeaturedCard({
  match,
  locale,
}: {
  match: MatchListItem | null;
  locale: Locale;
}) {
  if (!match) {
    return (
      <EmptyStateVisual
        src="/assets/lucarne/claude-pack-20260525/svg/01-dashboard-today-command.svg"
        alt={
          locale === "fr"
            ? "Aucun match programmé"
            : "No upcoming match"
        }
        title={
          locale === "fr"
            ? "Aucun match programmé pour le moment"
            : "No upcoming match yet"
        }
        body={
          locale === "fr"
            ? "Le calendrier complet apparaîtra ici dès qu'il sera publié."
            : "The full schedule will surface here as soon as it's published."
        }
        compact
      />
    );
  }

  const isLive = match.status === "live";
  const home = teamName(match.home_team, match.home_placeholder, locale);
  const away = teamName(match.away_team, match.away_placeholder, locale);
  const kickoff = new Date(match.kickoff_at);
  const dateLabel = kickoff.toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { weekday: "long", day: "numeric", month: "long" },
  );
  const timeLabel = kickoff.toLocaleTimeString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" },
  );

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[14px] border p-5 backdrop-blur-xl",
        isLive
          ? "border-violet-500/45 bg-gradient-to-br from-violet-500/[0.18] via-violet-500/[0.04] to-transparent shadow-[0_18px_50px_rgba(124,92,255,0.18)]"
          : "border-primary-500/30 bg-gradient-to-br from-primary-500/[0.1] via-gold-500/[0.04] to-transparent",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
            isLive
              ? "bg-violet-500/20 text-violet-200"
              : "bg-primary-500/15 text-primary-300",
          )}
        >
          {isLive ? (
            <>
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-300 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-300" />
              </span>
              LIVE
            </>
          ) : (
            <>
              <CalendarClock className="size-3" strokeWidth={2.5} />
              {locale === "fr" ? "Prochain coup d'envoi" : "Next kickoff"}
            </>
          )}
        </span>
        <span className="font-mono tabular-nums text-text-tertiary">
          {dateLabel} · {timeLabel}
        </span>
      </header>

      <div className="flex items-center justify-between gap-3">
        <TeamSide
          name={home}
          isoCode={match.home_team?.iso_code ?? null}
          align="left"
        />
        <ScoreOrVs match={match} isLive={isLive} />
        <TeamSide
          name={away}
          isoCode={match.away_team?.iso_code ?? null}
          align="right"
        />
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2">
        {match.venue && (
          <span className="truncate text-[11px] text-text-tertiary">
            {locale === "fr" ? match.venue.city_fr : match.venue.city_en} ·{" "}
            {match.venue.name}
          </span>
        )}
        <Link
          href={
            isLive ? "/live" : `/matches/${match.id}`
          }
          className={cn(
            "inline-flex items-center gap-1 rounded-[8px] px-3 py-1.5 text-xs font-bold transition",
            isLive
              ? "bg-violet-500 text-abyss shadow-glow-violet hover:bg-violet-400"
              : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
          )}
        >
          {isLive
            ? locale === "fr"
              ? "Suivre live"
              : "Follow live"
            : locale === "fr"
              ? "Voir le match"
              : "Match details"}
          <ArrowRight className="size-3" strokeWidth={2.5} />
        </Link>
      </footer>
    </article>
  );
}

function TeamSide({
  name,
  isoCode,
  align,
}: {
  name: string;
  isoCode: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <Flag isoCode={isoCode} size="lg" />
      <span className="truncate font-display text-base font-semibold text-text-primary sm:text-lg">
        {name}
      </span>
    </div>
  );
}

function ScoreOrVs({
  match,
  isLive,
}: {
  match: MatchListItem;
  isLive: boolean;
}) {
  if (isLive || match.status === "finished") {
    return (
      <div className="shrink-0 px-3">
        <div
          className={cn(
            "font-display text-3xl font-bold tabular-nums leading-none",
            isLive ? "text-violet-200" : "text-text-primary",
          )}
        >
          {match.home_score ?? 0}
          <span className="mx-1.5 text-text-tertiary">·</span>
          {match.away_score ?? 0}
        </div>
      </div>
    );
  }
  return (
    <span className="shrink-0 px-3 font-display text-2xl font-bold text-text-tertiary">
      VS
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Upcoming list                                                             */
/* -------------------------------------------------------------------------- */

function UpcomingCard({
  matches,
  anyToday,
  locale,
}: {
  matches: MatchListItem[];
  anyToday: boolean;
  locale: Locale;
}) {
  return (
    <article className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <header className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3" strokeWidth={2} />
          {locale === "fr" ? "Prochains matchs" : "Upcoming"}
        </span>
        <Link
          href="/matches?view=calendar"
          className="text-text-tertiary transition hover:text-text-primary"
        >
          {locale === "fr" ? "Tous →" : "All →"}
        </Link>
      </header>
      {matches.length === 0 ? (
        <p className="py-2 text-xs text-text-tertiary">
          {anyToday
            ? locale === "fr"
              ? "Plus rien après le match en vedette."
              : "Nothing else after the featured one."
            : locale === "fr"
              ? "Calendrier vide."
              : "Calendar empty."}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {matches.map((m) => (
            <UpcomingRow key={m.id} match={m} locale={locale} />
          ))}
        </ul>
      )}
    </article>
  );
}

function UpcomingRow({
  match,
  locale,
}: {
  match: MatchListItem;
  locale: Locale;
}) {
  const kickoff = new Date(match.kickoff_at);
  const isToday = sameDay(kickoff, new Date());
  const dateLabel = isToday
    ? kickoff.toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      })
    : kickoff.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
        day: "2-digit",
        month: "short",
      });
  const home = teamName(match.home_team, match.home_placeholder, locale);
  const away = teamName(match.away_team, match.away_placeholder, locale);

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 py-1.5 text-xs transition hover:text-text-primary"
      >
        <span
          className={cn(
            "font-mono tabular-nums",
            isToday ? "font-bold text-primary-300" : "text-text-tertiary",
          )}
        >
          {dateLabel}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate font-semibold text-text-secondary">
            {home}
          </span>
          <Flag isoCode={match.home_team?.iso_code ?? null} size="xs" />
        </div>
        <span className="text-text-tertiary">vs</span>
        <div className="flex min-w-0 items-center gap-1.5">
          <Flag isoCode={match.away_team?.iso_code ?? null} size="xs" />
          <span className="truncate font-semibold text-text-secondary">
            {away}
          </span>
        </div>
      </Link>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mini leaderboard                                                          */
/* -------------------------------------------------------------------------- */

function LeaderboardCard({
  top5,
  myRow,
  currentUserId,
  totalPlayers,
  locale,
}: {
  top5: StandingEntry[];
  myRow: StandingEntry | null;
  currentUserId: string | null;
  totalPlayers: number;
  locale: Locale;
}) {
  if (top5.length === 0) {
    return (
      <article className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
        <header className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <Trophy className="size-3" strokeWidth={2} />
          {locale === "fr" ? "Classement" : "Leaderboard"}
        </header>
        <p className="py-2 text-xs text-text-tertiary">
          {locale === "fr"
            ? "Le classement s'ouvre dès le premier match résolu."
            : "Leaderboard opens after the first settled match."}
        </p>
      </article>
    );
  }
  return (
    <article className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] p-4 backdrop-blur-xl">
      <header className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="size-3" strokeWidth={2} />
          {locale === "fr" ? "Classement" : "Leaderboard"}
          <span className="font-mono normal-case text-text-tertiary">
            ({totalPlayers})
          </span>
        </span>
        <Link
          href="/leaderboard/global"
          className="text-text-tertiary transition hover:text-text-primary"
        >
          {locale === "fr" ? "Tout voir →" : "View all →"}
        </Link>
      </header>
      <ul className="divide-y divide-white/[0.05]">
        {top5.map((row) => (
          <LeaderRow
            key={row.user_id}
            row={row}
            isMe={row.user_id === currentUserId}
            locale={locale}
          />
        ))}
        {myRow && (
          <li
            className="border-t-2 border-dashed border-white/[0.08]"
          >
            <LeaderRow row={myRow} isMe locale={locale} />
          </li>
        )}
      </ul>
    </article>
  );
}

function LeaderRow({
  row,
  isMe,
  locale,
}: {
  row: StandingEntry;
  isMe: boolean;
  locale: Locale;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_1fr_auto] items-center gap-2 py-1.5 text-sm",
        isMe && "rounded-md bg-primary-500/[0.08] px-2",
      )}
    >
      <RankBadge rank={row.rank} />
      <span
        className={cn(
          "truncate text-xs",
          isMe ? "font-bold text-primary-300" : "font-semibold text-text-secondary",
        )}
      >
        @{row.username}
        {isMe && (
          <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-400">
            {locale === "fr" ? "Toi" : "You"}
          </span>
        )}
      </span>
      <span
        className={cn(
          "font-display text-xs font-bold tabular-nums",
          row.rank === 1
            ? "text-gold-300"
            : row.rank === 2
              ? "text-text-primary"
              : row.rank === 3
                ? "text-amber-400"
                : "text-text-secondary",
        )}
      >
        {row.total_points}
        <span className="ml-0.5 text-[9px] font-medium text-text-tertiary">pts</span>
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex size-6 items-center justify-center rounded-md bg-gold-500/15 ring-1 ring-gold-500/35">
        <Crown className="size-3 text-gold-300" strokeWidth={2.5} />
      </span>
    );
  }
  if (rank <= 3) {
    return (
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
          rank === 2
            ? "bg-text-secondary/15 text-text-primary ring-1 ring-text-secondary/30"
            : "bg-amber-700/15 text-amber-300 ring-1 ring-amber-700/30",
        )}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="text-center font-mono text-[11px] text-text-tertiary">
      #{rank}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function teamName(
  team: { name_fr: string; name_en: string } | null,
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? "—";
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hasMatchesToday(matches: MatchListItem[], now: number): boolean {
  const today = new Date(now);
  return matches.some((m) => sameDay(new Date(m.kickoff_at), today));
}

