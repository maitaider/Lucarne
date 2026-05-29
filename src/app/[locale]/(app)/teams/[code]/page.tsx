import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getTeamByCode } from "@/data/world-cup-2026";
import { listMatches } from "@/lib/matches/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Flag } from "@/components/team/flag";
import { Reveal } from "@/components/ui/reveal";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Globe2,
  Shirt,
  Trophy,
  Users,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

type RosterPlayer = {
  id: string;
  display_name: string | null;
  name: string;
  position: string | null;
  shirt_number: number | null;
  club: string | null;
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const team = getTeamByCode(code.toUpperCase());
  if (!team) notFound();

  const [allMatches, myPicks] = await Promise.all([
    listMatches(),
    getMyPicksByMatch(),
  ]);

  const matches = allMatches.filter(
    (m) =>
      m.home_team?.fifa_code === team.fifa_code ||
      m.away_team?.fifa_code === team.fifa_code,
  );

  // Resolve the DB team id from any fixture, then load the real roster.
  const teamId =
    matches
      .map((m) =>
        m.home_team?.fifa_code === team.fifa_code
          ? m.home_team?.id
          : m.away_team?.id,
      )
      .find(Boolean) ?? null;

  let roster: RosterPlayer[] = [];
  if (teamId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .schema("ref")
      .from("players")
      .select("id, display_name, name, position, shirt_number, club")
      .eq("team_id", teamId)
      .eq("active", true)
      .order("shirt_number", { ascending: true, nullsFirst: false });
    roster = (data as RosterPlayer[] | null) ?? [];
  }

  const name = fr ? team.name_fr : team.name_en;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
      <Link
        href="/matches"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        {fr ? "Tous les matchs" : "All matches"}
      </Link>

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[16px] border border-white/[0.1] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_70%_at_15%_0%,rgba(34,217,130,0.10),transparent_60%)]"
        />
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Flag
            isoCode={team.iso_code?.toLowerCase() ?? null}
            size="2xl"
            className="!h-16 !w-24 rounded-[10px] ring-1 ring-white/15"
          />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              {name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge icon={Users} tone="primary">
                {fr ? "Groupe" : "Group"} {team.group_label}
              </Badge>
              <Badge icon={Globe2} tone="violet">
                {team.confederation}
              </Badge>
              <Badge icon={Trophy} tone="gold">
                {fr ? "FIFA" : "FIFA"} #{team.ranking}
              </Badge>
              <Badge icon={Shirt} tone="steel">
                {team.fifa_code}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Squad */}
      <Reveal className="mt-6">
        <section className="rounded-[14px] border border-white/[0.08] bg-surface-1/[0.6] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <Users className="size-5 text-primary-400" strokeWidth={1.7} />
            {roster.length > 0
              ? fr
                ? "Effectif"
                : "Squad"
              : fr
                ? "Joueurs à suivre"
                : "Players to watch"}
            <span className="text-sm font-medium text-text-tertiary">
              · {roster.length > 0 ? roster.length : team.key_players.length}
            </span>
          </h2>

          {roster.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {roster.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.035] px-3 py-2"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-primary-500/10 font-mono text-xs font-bold text-primary-300 ring-1 ring-primary-500/25">
                    {p.shirt_number ?? "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-text-primary">
                      {p.display_name ?? p.name}
                    </div>
                    <div className="truncate text-xs text-text-tertiary">
                      {[p.position, p.club].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {team.key_players.map((player, i) => (
                <li
                  key={player}
                  className="flex items-center gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.035] px-3 py-2"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-gold-500/[0.1] font-mono text-xs font-bold text-gold-400 ring-1 ring-gold-500/25">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {player}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {roster.length === 0 && (
            <p className="mt-4 text-xs leading-5 text-text-tertiary">
              {fr
                ? "Watchlist éditoriale ; les effectifs FIFA complets (26 joueurs) sont attendus le 2 juin 2026."
                : "Editorial watchlist; full FIFA 26-player squads are due on June 2, 2026."}
            </p>
          )}
        </section>
      </Reveal>

      {/* Schedule */}
      <Reveal className="mt-6" delayMs={80}>
        <section className="rounded-[14px] border border-white/[0.08] bg-surface-1/[0.6] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <CalendarDays className="size-5 text-primary-400" strokeWidth={1.7} />
            {fr ? "Calendrier" : "Schedule"}
            <span className="text-sm font-medium text-text-tertiary">
              · {matches.length}
            </span>
          </h2>

          {matches.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {fr ? "Aucun match programmé." : "No scheduled matches."}
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {matches.map((m) => (
                <TeamFixtureRow
                  key={m.id}
                  match={m}
                  teamCode={team.fifa_code}
                  pick={parseScore(
                    (myPicks.get(m.id) ?? []).find(
                      (p) => p.bet_type === "exact_score",
                    )?.payload,
                  )}
                  locale={L}
                />
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </main>
  );
}

function TeamFixtureRow({
  match,
  teamCode,
  pick,
  locale,
}: {
  match: Awaited<ReturnType<typeof listMatches>>[number];
  teamCode: string;
  pick: { home: number; away: number } | null;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const isHome = match.home_team?.fifa_code === teamCode;
  const opp = isHome ? match.away_team : match.home_team;
  const oppName = opp
    ? fr
      ? opp.name_fr
      : opp.name_en
    : (isHome ? match.away_placeholder : match.home_placeholder) ?? "?";
  const kickoff = new Date(match.kickoff_at);
  const date = kickoff.toLocaleDateString(fr ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
  });
  const time = kickoff.toLocaleTimeString(fr ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  const stageLabel =
    match.stage === "group" && match.group_label
      ? `${fr ? "Groupe" : "Group"} ${match.group_label}`
      : match.stage.toUpperCase();

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="group flex items-center gap-3 py-2.5 transition hover:bg-white/[0.02]"
      >
        <div className="w-14 shrink-0 text-center">
          <div className="font-mono text-xs font-semibold tabular-nums text-text-primary">
            {date}
          </div>
          <div className="font-mono text-[10px] tabular-nums text-text-tertiary">
            {time}
          </div>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
          {fr ? (isHome ? "dom." : "ext.") : isHome ? "H" : "A"}
        </span>
        <Flag isoCode={opp?.iso_code ?? null} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          {oppName}
        </span>
        {pick ? (
          <span className="rounded-full bg-primary-500/12 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-primary-300 ring-1 ring-primary-500/25">
            {isHome ? `${pick.home}–${pick.away}` : `${pick.away}–${pick.home}`}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {stageLabel}
          </span>
        )}
        <ArrowRight
          className="size-4 shrink-0 text-text-tertiary transition group-hover:translate-x-0.5 group-hover:text-text-primary"
          strokeWidth={2}
        />
      </Link>
    </li>
  );
}

function Badge({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof Users;
  tone: "primary" | "gold" | "violet" | "steel";
  children: React.ReactNode;
}) {
  const cls = {
    primary: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
    gold: "border-gold-500/30 bg-gold-500/[0.08] text-gold-300",
    violet: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
    steel: "border-white/15 bg-white/[0.06] text-text-secondary",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {children}
    </span>
  );
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
