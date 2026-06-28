import { setRequestLocale } from "next-intl/server";
import { getKnockoutDailyRecap, type RecapMatch } from "@/lib/matches/knockout-recap";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { LiveRefresh } from "@/components/live/live-refresh";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/team/flag";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CalendarDays, Crown, Trophy } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import type { MatchStage } from "@/lib/matches/shared";

const STAGE_LABEL: Record<MatchStage, { fr: string; en: string }> = {
  group: { fr: "Groupes", en: "Groups" },
  r32: { fr: "16ᵉ de finale", en: "Round of 32" },
  r16: { fr: "8ᵉ de finale", en: "Round of 16" },
  qf: { fr: "Quart de finale", en: "Quarter-final" },
  sf: { fr: "Demi-finale", en: "Semi-final" },
  third_place: { fr: "Match pour la 3ᵉ place", en: "Third place" },
  final: { fr: "Finale", en: "Final" },
};

function teamName(t: RecapMatch["home"], fr: boolean): string {
  const n = fr ? t.name_fr : t.name_en;
  return n ?? t.ph ?? "?";
}

function dayLabel(isoDate: string, fr: boolean): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function KnockoutDailyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const recap = await getKnockoutDailyRecap();
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <AppPageShell width="wide">
      <LiveRefresh />
      <PageHero
        kicker={fr ? "Phase finale" : "Knockouts"}
        kickerIcon={Trophy}
        accent="gold"
        title={fr ? "Récap quotidien" : "Daily recap"}
        description={
          fr
            ? "Jour par jour : les matchs à élimination et les points marqués ce jour-là sur les pronos de score. Les points du bracket s'ajoutent au classement à mesure que les équipes avancent."
            : "Day by day: the knockout fixtures and the points scored that day on score predictions. Bracket points add to the standings as teams advance."
        }
      />

      {recap.length === 0 ? (
        <Card padded="lg" className="text-center text-sm text-text-tertiary">
          {fr
            ? "Le récap s'ouvre dès le premier match à élimination."
            : "The recap opens with the first knockout match."}
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {recap.map((d) => {
            const isToday = d.day === todayKey;
            const played = d.matches.filter((m) => m.status === "finished").length;
            return (
              <Card key={d.day} padded="none" accent={isToday ? "gold" : undefined}>
                <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
                  <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
                    <CalendarDays className="size-4 text-text-tertiary" strokeWidth={1.7} />
                    <span className="capitalize">{dayLabel(d.day, fr)}</span>
                    {isToday && (
                      <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-500/30">
                        {fr ? "Aujourd'hui" : "Today"}
                      </span>
                    )}
                  </h2>
                  <span className="text-[11px] tabular-nums text-text-tertiary">
                    {played}/{d.matches.length} {fr ? "joués" : "played"}
                  </span>
                </header>

                <div className="grid grid-cols-1 gap-px bg-white/[0.05] lg:grid-cols-2">
                  {/* Matches */}
                  <div className="bg-surface-1/40 p-3">
                    <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      {fr ? "Matchs" : "Matches"}
                    </h3>
                    <ul className="space-y-1">
                      {d.matches.map((m) => (
                        <li
                          key={`${d.day}-${m.match_number}`}
                          className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                        >
                          <span className="hidden w-24 shrink-0 truncate text-[10px] text-text-tertiary sm:inline">
                            {STAGE_LABEL[m.stage]?.[fr ? "fr" : "en"] ?? m.stage}
                          </span>
                          <Flag isoCode={m.home.iso} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-right text-text-primary">
                            {teamName(m.home, fr)}
                          </span>
                          <span className="shrink-0 font-mono font-bold tabular-nums text-text-secondary">
                            {m.status === "finished"
                              ? `${m.home_score}–${m.away_score}`
                              : fr
                                ? "vs"
                                : "vs"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-text-primary">
                            {teamName(m.away, fr)}
                          </span>
                          <Flag isoCode={m.away.iso} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Daily points leaderboard */}
                  <div className="bg-surface-1/40 p-3">
                    <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      {fr ? "Points marqués ce jour" : "Points scored this day"}
                    </h3>
                    {d.leaders.length === 0 ? (
                      <p className="px-1 py-3 text-xs text-text-tertiary">
                        {played === 0
                          ? fr
                            ? "Matchs à venir."
                            : "Matches upcoming."
                          : fr
                            ? "Personne n'a marqué de points ce jour."
                            : "No points scored this day."}
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {d.leaders.map((p, i) => (
                          <li
                            key={p.username}
                            className="flex items-center gap-2.5 rounded-sm px-1.5 py-1.5"
                          >
                            <span
                              className={cn(
                                "w-4 shrink-0 text-center text-[11px] font-bold tabular-nums",
                                i === 0 ? "text-gold-300" : "text-text-tertiary",
                              )}
                            >
                              {i === 0 ? (
                                <Crown
                                  className="mx-auto size-3.5"
                                  aria-label={fr ? "1ʳᵉ place du jour" : "Top of the day"}
                                />
                              ) : (
                                i + 1
                              )}
                            </span>
                            <UserAvatar
                              src={p.avatar_url}
                              name={p.display_name ?? p.username}
                              className="size-6 ring-1 ring-white/[0.1]"
                              fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[9px] font-bold text-text-primary"
                            />
                            <Link
                              href={`/u/${p.username}`}
                              className="min-w-0 flex-1 truncate text-xs font-semibold text-text-secondary transition hover:text-text-primary hover:underline"
                            >
                              @{p.username}
                            </Link>
                            <span className="shrink-0 font-display text-sm font-bold tabular-nums text-primary-300">
                              +{p.points}
                              <span className="ml-0.5 text-[9px] font-medium text-text-tertiary">
                                pts
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppPageShell>
  );
}
