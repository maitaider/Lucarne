import { setRequestLocale } from "next-intl/server";
import { listSquadsForBrowse } from "@/lib/players/queries";
import {
  SquadBrowser,
  type BrowseTeam,
  type BrowsePlayer,
} from "@/components/team/squad-browser";
import { Users } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * `/teams` — browse all 48 World Cup 2026 teams and their squads, with a
 * search bar that finds a team (by name/code) or a player (by name/club/number).
 * Data comes from ref.players (definitive squads); age is derived from birth_date.
 */
export default async function TeamsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const squad = await listSquadsForBrowse();

  // Derive the team list (one entry per team, with squad size) from the roster.
  const teamMap = new Map<string, BrowseTeam>();
  for (const p of squad) {
    if (!p.team_fifa_code) continue;
    const existing = teamMap.get(p.team_fifa_code);
    if (existing) {
      existing.count += 1;
      continue;
    }
    teamMap.set(p.team_fifa_code, {
      fifa_code: p.team_fifa_code,
      iso_code: p.team_iso_code,
      name_fr: p.team_name_fr,
      name_en: p.team_name_en,
      confederation: p.team_confederation,
      count: 1,
    });
  }
  const teams = [...teamMap.values()].sort((a, b) =>
    (fr ? a.name_fr : a.name_en).localeCompare(
      fr ? b.name_fr : b.name_en,
      fr ? "fr" : "en",
    ),
  );

  const players: BrowsePlayer[] = squad.map((p) => ({
    id: p.id,
    name: p.name,
    display_name: p.display_name,
    position: p.position,
    shirt_number: p.shirt_number,
    club: p.club,
    age: p.age,
    team_fifa_code: p.team_fifa_code,
    team_iso_code: p.team_iso_code,
    team_name_fr: p.team_name_fr,
    team_name_en: p.team_name_en,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-text-primary">
          <Users className="size-6 text-primary-400" strokeWidth={1.7} />
          {fr ? "Équipes & joueurs" : "Teams & players"}
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          {fr
            ? `Les ${teams.length} équipes de la Coupe du Monde 2026 et leurs effectifs. Cherche une équipe ou un joueur.`
            : `All ${teams.length} 2026 World Cup teams and their squads. Search for a team or a player.`}
        </p>
      </header>

      <SquadBrowser teams={teams} players={players} locale={L} />
    </main>
  );
}
