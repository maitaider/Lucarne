"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Flag } from "@/components/team/flag";
import { Search, X } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export type BrowseTeam = {
  fifa_code: string;
  iso_code: string | null;
  name_fr: string;
  name_en: string;
  confederation: string;
  count: number;
};

export type BrowsePlayer = {
  id: string;
  name: string;
  display_name: string;
  position: "GK" | "DEF" | "MID" | "FWD" | null;
  shirt_number: number | null;
  club: string | null;
  age: number | null;
  team_fifa_code: string;
  team_iso_code: string | null;
  team_name_fr: string;
  team_name_en: string;
};

const MAX_PLAYER_RESULTS = 60;

/** Accent-insensitive, lowercase normalize (matches player-combobox behaviour). */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function SquadBrowser({
  teams,
  players,
  locale,
}: {
  teams: BrowseTeam[];
  players: BrowsePlayer[];
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [query, setQuery] = useState("");
  const q = normalize(query);

  const matchedTeams = useMemo(() => {
    if (!q) return teams;
    return teams.filter(
      (t) =>
        normalize(t.name_fr).includes(q) ||
        normalize(t.name_en).includes(q) ||
        t.fifa_code.toLowerCase().includes(q),
    );
  }, [q, teams]);

  const matchedPlayers = useMemo(() => {
    if (!q) return [];
    return players.filter(
      (p) =>
        normalize(p.display_name).includes(q) ||
        normalize(p.name).includes(q) ||
        (!!p.club && normalize(p.club).includes(q)) ||
        (p.shirt_number != null && String(p.shirt_number) === q),
    );
  }, [q, players]);

  const shownPlayers = matchedPlayers.slice(0, MAX_PLAYER_RESULTS);

  return (
    <div>
      <div className="relative mb-6 w-full sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
          strokeWidth={2}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            fr ? "Rechercher une équipe ou un joueur…" : "Search a team or player…"
          }
          aria-label={fr ? "Rechercher une équipe ou un joueur" : "Search a team or player"}
          className="w-full rounded-full border border-white/[0.1] bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary-500/50 focus:bg-white/[0.07]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={fr ? "Effacer" : "Clear"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-tertiary transition hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {!q ? (
        <TeamGrid teams={matchedTeams} fr={fr} />
      ) : (
        <div className="space-y-7">
          {matchedTeams.length > 0 && (
            <section>
              <SectionLabel>
                {(fr ? "Équipes" : "Teams") + ` · ${matchedTeams.length}`}
              </SectionLabel>
              <TeamGrid teams={matchedTeams} fr={fr} />
            </section>
          )}

          {matchedPlayers.length > 0 && (
            <section>
              <SectionLabel>
                {(fr ? "Joueurs" : "Players") + ` · ${matchedPlayers.length}`}
              </SectionLabel>
              <ul className="grid gap-2 sm:grid-cols-2">
                {shownPlayers.map((p) => (
                  <PlayerRow key={p.id} player={p} fr={fr} />
                ))}
              </ul>
              {matchedPlayers.length > shownPlayers.length && (
                <p className="mt-3 text-xs text-text-tertiary">
                  {fr
                    ? `+ ${matchedPlayers.length - shownPlayers.length} autres — affine ta recherche.`
                    : `+ ${matchedPlayers.length - shownPlayers.length} more — refine your search.`}
                </p>
              )}
            </section>
          )}

          {matchedTeams.length === 0 && matchedPlayers.length === 0 && (
            <p className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-sm text-text-tertiary">
              {fr ? "Aucun résultat." : "No results."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
      {children}
    </h2>
  );
}

function TeamGrid({ teams, fr }: { teams: BrowseTeam[]; fr: boolean }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((t) => (
        <li key={t.fifa_code}>
          <Link
            href={`/teams/${t.fifa_code}`}
            className="flex items-center gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 transition hover:border-primary-500/40 hover:bg-white/[0.06]"
          >
            <Flag
              isoCode={t.iso_code?.toLowerCase() ?? null}
              size="lg"
              className="!h-8 !w-11 shrink-0 rounded-[6px] ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-primary">
                {fr ? t.name_fr : t.name_en}
              </div>
              <div className="truncate text-xs text-text-tertiary">
                {t.confederation} · {t.count} {fr ? "joueurs" : "players"}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PlayerRow({ player: p, fr }: { player: BrowsePlayer; fr: boolean }) {
  return (
    <li>
      <Link
        href={`/teams/${p.team_fifa_code}`}
        className="flex items-center gap-3 rounded-sm border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition hover:border-primary-500/40 hover:bg-white/[0.06]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-primary-500/10 font-mono text-xs font-bold text-primary-300 ring-1 ring-primary-500/25">
          {p.shirt_number ?? "–"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-text-primary">
            {p.display_name}
          </div>
          <div className="truncate text-xs text-text-tertiary">
            {[
              p.position,
              p.club,
              p.age != null ? `${p.age} ${fr ? "ans" : "yrs"}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <Flag
            isoCode={p.team_iso_code?.toLowerCase() ?? null}
            size="sm"
            className="!h-4 !w-6 rounded-[3px] ring-1 ring-white/10"
          />
          <span className="font-mono text-[10px] font-bold text-text-tertiary">
            {p.team_fifa_code}
          </span>
        </span>
      </Link>
    </li>
  );
}
