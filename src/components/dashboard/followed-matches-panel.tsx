import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { FollowMatchButton } from "@/components/match/follow-match-button";
import { CalendarHeart, ArrowRight, Radio } from "lucide-react";
import type { MatchListItem } from "@/lib/matches/shared";
import type { Locale } from "@/i18n/routing";

function teamName(
  t: MatchListItem["home_team"],
  fr: boolean,
): { name: string; iso: string | null } {
  const s = Array.isArray(t) ? t[0] : t;
  if (!s) return { name: "—", iso: null };
  return { name: fr ? s.name_fr : s.name_en, iso: s.iso_code };
}

/**
 * Dashboard panel: the matches the user chose to follow (their calendar).
 * Upcoming/live first, then recently finished. Each row links to the match
 * and can be un-followed inline.
 */
export function FollowedMatchesPanel({
  matches,
  locale,
}: {
  matches: MatchListItem[];
  locale: Locale;
}) {
  const fr = locale === "fr";

  return (
    <section className="rounded-[12px] border border-white/[0.1] bg-surface-1/[0.55] p-4 backdrop-blur-xl sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <CalendarHeart className="size-5 text-primary-300" strokeWidth={1.9} />
          {fr ? "Mes matchs suivis" : "My followed matches"}
          {matches.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-tertiary">
              {matches.length}
            </span>
          )}
        </h2>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-300 underline-offset-4 hover:underline"
        >
          {fr ? "Calendrier" : "Schedule"}
          <ArrowRight className="size-3" strokeWidth={2.5} />
        </Link>
      </header>

      {matches.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/[0.12] bg-white/[0.02] px-3 py-4 text-center text-xs leading-5 text-text-tertiary">
          {fr
            ? "Aucun match suivi. Ouvre le calendrier et clique la cloche 🔔 sur les matchs qui t'intéressent — ils apparaîtront ici et tu seras notifié."
            : "No followed matches yet. Open the schedule and tap the 🔔 on the matches you care about — they'll show here and you'll get notified."}
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {matches.map((m) => {
            const home = teamName(m.home_team, fr);
            const away = teamName(m.away_team, fr);
            const live = m.status === "live";
            const finished = m.status === "finished";
            const kickoff = new Date(m.kickoff_at).toLocaleString(
              fr ? "fr-CA" : "en-CA",
              {
                timeZone: "America/Toronto",
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              },
            );
            return (
              <li key={m.id} className="flex items-center gap-2 py-2.5">
                <Link
                  href={`/matches/${m.id}`}
                  className="group flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Flag isoCode={home.iso} size="sm" rounded />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {home.name}
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-text-tertiary">
                      {finished || live
                        ? `${m.home_score ?? 0}–${m.away_score ?? 0}`
                        : "v"}
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary">
                      {away.name}
                    </span>
                    <Flag isoCode={away.iso} size="sm" rounded />
                  </div>
                  <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[11px] text-text-tertiary sm:flex">
                    {live ? (
                      <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-error">
                        <Radio className="size-3 animate-pulse" strokeWidth={2.5} />
                        {fr ? "En direct" : "Live"}
                      </span>
                    ) : finished ? (
                      <span className="font-semibold text-text-tertiary">
                        {fr ? "Terminé" : "Final"}
                      </span>
                    ) : (
                      kickoff
                    )}
                  </span>
                </Link>
                <FollowMatchButton
                  matchId={m.id}
                  initialFollowing
                  locale={locale}
                  variant="icon"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
