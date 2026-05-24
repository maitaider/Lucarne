import { setRequestLocale } from "next-intl/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { listPlayersForTeams, type PlayerRow } from "@/lib/players/queries";
import { PlayersAdminPanel } from "./players-admin-panel";
import { ShieldCheck, Users } from "lucide-react";
import type { Locale } from "@/i18n/routing";

type TeamLite = { id: string; fifa_code: string; iso_code: string | null; name_fr: string; name_en: string };

export default async function AdminPlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { locale } = await params;
  const { team: selectedTeamId } = await searchParams;
  setRequestLocale(locale);
  const L = locale as Locale;

  const teams = await fetchTeams();
  const currentTeam =
    teams.find((t) => t.id === selectedTeamId) ?? teams[0] ?? null;

  const roster: PlayerRow[] = currentTeam
    ? await listPlayersForTeams([currentTeam.id])
    : [];

  return (
    <div className="space-y-6">
      <header className="rounded-[12px] border border-white/[0.1] bg-surface-1/[0.7] p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-violet-500/35 bg-violet-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300">
              <Users className="size-3.5" strokeWidth={1.7} />
              {L === "fr" ? "Effectifs" : "Rosters"}
            </div>
            <h1 className="font-display text-2xl font-semibold text-text-primary sm:text-3xl">
              {L === "fr" ? "Gestion des joueurs" : "Player management"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
              {L === "fr"
                ? "Ajoute, modifie ou désactive un joueur. Les pronos buteurs des usagers tirent leur liste de cette table en temps réel."
                : "Add, edit, or deactivate a player. The scorer picker on /picks pulls from this table live."}
            </p>
          </div>
          <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {L === "fr" ? "Total" : "Total"}
            </div>
            <div className="font-display text-lg font-bold tabular-nums text-text-primary">
              {roster.length}{" "}
              <span className="text-xs font-medium text-text-tertiary">
                {L === "fr" ? "joueurs" : "players"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <PlayersAdminPanel
        teams={teams}
        selectedTeamId={currentTeam?.id ?? null}
        roster={roster}
        locale={L}
      />

      <p className="flex items-center gap-2 text-[10px] text-text-tertiary">
        <ShieldCheck className="size-3" strokeWidth={1.5} />
        {L === "fr"
          ? "Audit-log: chaque création/édition/suppression est tracée dans private.audit_log."
          : "Audit log: every create/update/delete is recorded in private.audit_log."}
      </p>
    </div>
  );
}

async function fetchTeams(): Promise<TeamLite[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await getSupabaseServer();
  // Only teams that play in the tournament.
  const { data: matches } = await supabase
    .schema("ref")
    .from("matches")
    .select("home_team_id, away_team_id");
  const ids = new Set<string>();
  for (const m of matches ?? []) {
    if (m.home_team_id) ids.add(m.home_team_id);
    if (m.away_team_id) ids.add(m.away_team_id);
  }
  if (ids.size === 0) return [];

  const { data } = await supabase
    .schema("ref")
    .from("teams")
    .select("id, fifa_code, iso_code, name_fr, name_en")
    .in("id", Array.from(ids))
    .order("name_fr", { ascending: true });
  return (data ?? []) as TeamLite[];
}
