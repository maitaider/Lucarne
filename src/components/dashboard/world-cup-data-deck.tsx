"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { TeamEmblem } from "@/components/team/team-emblem";
import type { Locale } from "@/i18n/routing";
import type { WorldCupTeam, WorldCupVenue } from "@/data/world-cup-2026";
import type { MatchListItem } from "@/lib/matches/queries";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  ChevronRight,
  MapPin,
  RadioTower,
  ShieldCheck,
  Trophy,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";

type TabKey = "matches" | "venues" | "players";

const tabs: { key: TabKey; icon: LucideIcon; labelFr: string; labelEn: string }[] = [
  { key: "matches", icon: CalendarClock, labelFr: "Matchs", labelEn: "Matches" },
  { key: "venues", icon: MapPin, labelFr: "Stades", labelEn: "Venues" },
  { key: "players", icon: UserRoundSearch, labelFr: "Joueurs", labelEn: "Players" },
];

export function WorldCupDataDeck({
  locale,
  matches,
  teams,
  venues,
}: {
  locale: Locale;
  matches: MatchListItem[];
  teams: WorldCupTeam[];
  venues: WorldCupVenue[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("matches");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [selectedVenueName, setSelectedVenueName] = useState(venues[0]?.name ?? "");
  const [selectedTeamCode, setSelectedTeamCode] = useState(teams[0]?.fifa_code ?? "");

  const featuredMatches = useMemo(() => matches.slice(0, 12), [matches]);
  const selectedMatch =
    featuredMatches.find((match) => match.id === selectedMatchId) ?? featuredMatches[0] ?? null;
  const selectedVenue =
    venues.find((venue) => venue.name === selectedVenueName) ?? venues[0] ?? null;
  const selectedTeam =
    teams.find((team) => team.fifa_code === selectedTeamCode) ?? teams[0] ?? null;

  return (
    <section className="mb-8 overflow-hidden rounded-[8px] border border-white/[0.1] bg-abyss/[0.74] shadow-[0_26px_90px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4 border-b border-white/[0.08] bg-white/[0.035] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] text-gold-400 shadow-glow-gold">
            <RadioTower className="size-5" strokeWidth={1.7} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
              {locale === "fr" ? "Données réelles Mondial" : "Real World Cup data"}
            </p>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              {locale === "fr"
                ? "Console interactive FIFA 2026"
                : "Interactive FIFA 2026 console"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-[8px] border border-white/[0.08] bg-black/20 p-1">
          {tabs.map(({ key, icon: Icon, labelFr, labelEn }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-[7px] px-3 py-2 text-xs font-semibold transition",
                  isActive
                    ? "bg-primary-500 text-abyss shadow-glow-primary"
                    : "text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary",
                )}
              >
                <Icon className="size-4" strokeWidth={1.7} />
                {locale === "fr" ? labelFr : labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "matches" && selectedMatch && (
        <MatchesPanel
          locale={locale}
          matches={featuredMatches}
          selectedMatch={selectedMatch}
          onSelect={setSelectedMatchId}
        />
      )}

      {activeTab === "venues" && selectedVenue && (
        <VenuesPanel
          locale={locale}
          venues={venues}
          selectedVenue={selectedVenue}
          onSelect={setSelectedVenueName}
        />
      )}

      {activeTab === "players" && selectedTeam && (
        <PlayersPanel
          locale={locale}
          teams={teams}
          selectedTeam={selectedTeam}
          onSelect={setSelectedTeamCode}
        />
      )}
    </section>
  );
}

function MatchesPanel({
  locale,
  matches,
  selectedMatch,
  onSelect,
}: {
  locale: Locale;
  matches: MatchListItem[];
  selectedMatch: MatchListItem;
  onSelect: (matchId: string) => void;
}) {
  const home = teamName(selectedMatch.home_team, selectedMatch.home_placeholder, locale);
  const away = teamName(selectedMatch.away_team, selectedMatch.away_placeholder, locale);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-1">
        {matches.map((match) => {
          const isActive = match.id === selectedMatch.id;
          const matchHome = teamName(match.home_team, match.home_placeholder, locale);
          const matchAway = teamName(match.away_team, match.away_placeholder, locale);
          return (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelect(match.id)}
              className={cn(
                "group grid grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition",
                isActive
                  ? "border-primary-500/45 bg-primary-500/[0.11] shadow-glow-primary"
                  : "border-white/[0.08] bg-white/[0.035] hover:border-primary-500/28 hover:bg-white/[0.06]",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <TeamEmblem code={match.home_team?.fifa_code} name={matchHome} size="sm" />
                  <span className="truncate text-xs font-semibold text-text-primary">
                    {matchHome}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-text-tertiary">vs</span>
                  <TeamEmblem code={match.away_team?.fifa_code} name={matchAway} size="sm" />
                  <span className="truncate text-xs font-semibold text-text-primary">
                    {matchAway}
                  </span>
                </span>
                <span className="mt-1 block truncate text-[10px] font-medium text-text-tertiary">
                  {stageLabel(match, locale)} ·{" "}
                  {match.venue
                    ? locale === "fr"
                      ? match.venue.city_fr
                      : match.venue.city_en
                    : locale === "fr"
                      ? "ville à confirmer"
                      : "city TBD"}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "size-4 transition group-hover:translate-x-0.5",
                  isActive ? "text-primary-400" : "text-text-tertiary",
                )}
                strokeWidth={1.7}
              />
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-[8px] border border-white/[0.1] bg-[radial-gradient(circle_at_20%_15%,rgba(34,217,130,0.16),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(245,196,71,0.14),transparent_28%),rgba(255,255,255,0.035)] p-5">
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-primary-500/[0.1] to-transparent" />
        <div className="relative">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
                {stageLabel(selectedMatch, locale)}
              </p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-text-primary">
                {home} <span className="text-text-tertiary">vs</span> {away}
              </h3>
            </div>
            <span className="rounded-[8px] border border-white/[0.1] bg-black/20 px-2.5 py-1 font-mono text-xs text-text-secondary">
              #{selectedMatch.match_number}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <SquadTile
              align="right"
              name={home}
              code={selectedMatch.home_team?.fifa_code}
              tone="primary"
            />
            <div className="flex size-14 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.08] font-mono text-xs font-bold uppercase text-gold-400 shadow-glow-gold">
              VS
            </div>
            <SquadTile
              align="left"
              name={away}
              code={selectedMatch.away_team?.fifa_code}
              tone="violet"
            />
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <InfoPill
              label={locale === "fr" ? "Date" : "Date"}
              value={formatDate(selectedMatch.kickoff_at, locale)}
            />
            <InfoPill
              label={locale === "fr" ? "Heure" : "Time"}
              value={formatTime(selectedMatch.kickoff_at, locale)}
            />
            <InfoPill
              label={locale === "fr" ? "Stade" : "Venue"}
              value={selectedMatch.venue?.name ?? (locale === "fr" ? "À confirmer" : "TBD")}
            />
          </div>

          <Link
            href={`/matches/${selectedMatch.id}`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            {locale === "fr" ? "Ouvrir la fiche match" : "Open match room"}
            <ChevronRight className="size-4" strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function VenuesPanel({
  locale,
  venues,
  selectedVenue,
  onSelect,
}: {
  locale: Locale;
  venues: WorldCupVenue[];
  selectedVenue: WorldCupVenue;
  onSelect: (venueName: string) => void;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.72fr]">
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {venues.map((venue) => {
          const isActive = venue.name === selectedVenue.name;
          return (
            <button
              key={venue.name}
              type="button"
              onClick={() => onSelect(venue.name)}
              className={cn(
                "rounded-[8px] border p-3 text-left transition",
                isActive
                  ? "border-gold-500/45 bg-gold-500/[0.1] shadow-glow-gold"
                  : "border-white/[0.08] bg-white/[0.035] hover:border-gold-500/28 hover:bg-white/[0.06]",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-[8px] border border-white/[0.1] bg-black/20 text-primary-400">
                  <MapPin className="size-4" strokeWidth={1.7} />
                </span>
                <span className="font-mono text-[10px] text-text-tertiary">
                  {venue.match_count} {locale === "fr" ? "matchs" : "matches"}
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-text-primary">{venue.name}</p>
              <p className="mt-1 truncate text-xs text-text-tertiary">
                {locale === "fr" ? venue.city_fr : venue.city_en} · {venue.country}
              </p>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[8px] border border-white/[0.1] bg-[linear-gradient(145deg,rgba(245,196,71,0.11),rgba(34,217,130,0.06),rgba(255,255,255,0.03))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
              {locale === "fr" ? "Stade sélectionné" : "Selected venue"}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-text-primary">
              {selectedVenue.name}
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {locale === "fr" ? selectedVenue.city_fr : selectedVenue.city_en},{" "}
              {selectedVenue.country}
            </p>
          </div>
          <span className="flex size-14 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.1] text-gold-400 shadow-glow-gold">
            <Trophy className="size-7" strokeWidth={1.5} />
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <InfoPill
            label={locale === "fr" ? "Capacité" : "Capacity"}
            value={selectedVenue.capacity.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
          />
          <InfoPill
            label={locale === "fr" ? "Affiches" : "Fixtures"}
            value={`${selectedVenue.match_count}`}
          />
        </div>
        <div className="mt-5 h-24 overflow-hidden rounded-[8px] border border-white/[0.08] bg-black/20">
          <div className="h-full bg-[linear-gradient(110deg,transparent_0_18%,rgba(255,255,255,0.08)_18%_19%,transparent_19%_38%,rgba(34,217,130,0.12)_38%_39%,transparent_39%_58%,rgba(245,196,71,0.12)_58%_59%,transparent_59%_100%),radial-gradient(circle_at_50%_100%,rgba(34,217,130,0.22),transparent_56%)]" />
        </div>
      </div>
    </div>
  );
}

function PlayersPanel({
  locale,
  teams,
  selectedTeam,
  onSelect,
}: {
  locale: Locale;
  teams: WorldCupTeam[];
  selectedTeam: WorldCupTeam;
  onSelect: (teamCode: string) => void;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_0.86fr]">
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const isActive = team.fifa_code === selectedTeam.fifa_code;
          return (
            <button
              key={team.fifa_code}
              type="button"
              onClick={() => onSelect(team.fifa_code)}
              className={cn(
                "flex items-center gap-3 rounded-[8px] border p-3 text-left transition",
                isActive
                  ? "border-primary-500/45 bg-primary-500/[0.11] shadow-glow-primary"
                  : "border-white/[0.08] bg-white/[0.035] hover:border-primary-500/28 hover:bg-white/[0.06]",
              )}
            >
              <TeamEmblem code={team.fifa_code} name={team.name_fr} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">
                  {locale === "fr" ? team.name_fr : team.name_en}
                </span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  Groupe {team.group_label} · {team.confederation}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[8px] border border-white/[0.1] bg-[radial-gradient(circle_at_25%_15%,rgba(34,217,130,0.14),transparent_28%),rgba(255,255,255,0.035)] p-5">
        <div className="flex items-center gap-4">
          <TeamEmblem code={selectedTeam.fifa_code} name={selectedTeam.name_fr} size="2xl" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400">
              {locale === "fr" ? "Équipe sélectionnée" : "Selected team"}
            </p>
            <h3 className="font-display text-2xl font-semibold text-text-primary">
              {locale === "fr" ? selectedTeam.name_fr : selectedTeam.name_en}
            </h3>
            <p className="mt-1 text-xs text-text-tertiary">
              Groupe {selectedTeam.group_label} · {selectedTeam.confederation}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-[8px] border border-white/[0.08] bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ShieldCheck className="size-4 text-gold-400" strokeWidth={1.7} />
              {locale === "fr" ? "Joueurs à suivre" : "Players to watch"}
            </h4>
            <span className="font-mono text-[10px] text-text-tertiary">
              FIFA · 2026
            </span>
          </div>
          <div className="space-y-2">
            {selectedTeam.key_players.map((player, index) => (
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
              ? "Watchlist éditoriale; les listes finales FIFA de 26 joueurs doivent être déposées le 2 juin 2026."
              : "Editorial watchlist; FIFA final 26-player rosters are due on June 2, 2026."}
          </p>
        </div>
      </div>
    </div>
  );
}

function SquadTile({
  name,
  code,
  tone,
  align,
}: {
  name: string;
  code?: string;
  tone: "primary" | "violet";
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", align === "right" && "justify-end")}>
      {align === "right" && (
        <span className="truncate text-right font-display text-lg font-semibold text-text-primary">
          {name}
        </span>
      )}
      <TeamEmblem code={code} name={name} size="xl" tone={tone} />
      {align === "left" && (
        <span className="truncate font-display text-lg font-semibold text-text-primary">
          {name}
        </span>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-black/20 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function teamName(
  team: MatchListItem["home_team"],
  placeholder: string | null,
  locale: Locale,
): string {
  if (team) return locale === "fr" ? team.name_fr : team.name_en;
  return placeholder ?? (locale === "fr" ? "À déterminer" : "TBD");
}

function stageLabel(match: MatchListItem, locale: Locale): string {
  if (match.stage === "group" && match.group_label) {
    return `${locale === "fr" ? "Groupe" : "Group"} ${match.group_label}`;
  }
  const labels: Record<string, { fr: string; en: string }> = {
    r32: { fr: "1/16e de finale", en: "Round of 32" },
    r16: { fr: "8e de finale", en: "Round of 16" },
    qf: { fr: "Quart de finale", en: "Quarter-final" },
    sf: { fr: "Demi-finale", en: "Semi-final" },
    third_place: { fr: "3e place", en: "Third place" },
    final: { fr: "Finale", en: "Final" },
  };
  return labels[match.stage]?.[locale] ?? match.stage;
}

function formatDate(kickoffAt: string, locale: Locale): string {
  return new Date(kickoffAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function formatTime(kickoffAt: string, locale: Locale): string {
  return new Date(kickoffAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}
