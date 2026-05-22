import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  getLeagueBySlug,
  getLeagueStandings,
} from "@/lib/leagues/queries";
import { LeaderboardPodium } from "@/components/leaderboard/podium";
import { StandingsTable } from "@/components/leaderboard/standings-table";
import { getSupabaseServer } from "@/lib/supabase/server";
import { Users, Lock, Globe, Settings, UserPlus } from "lucide-react";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const standings = await getLeagueStandings(league.id);

  // Identify current user for highlight
  let currentUserId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }
  const isOwner = currentUserId === league.owner_id;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs text-text-tertiary">
          {league.visibility === "private" ? <Lock className="size-3" /> : <Globe className="size-3" />}
          <span className="uppercase tracking-wider">
            {league.visibility === "private"
              ? locale === "fr" ? "Ligue privée" : "Private league"
              : locale === "fr" ? "Ligue publique" : "Public league"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
              {league.name}
            </h1>
            {league.description && (
              <p className="mt-2 max-w-2xl text-text-secondary">{league.description}</p>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Link
                href={`/leagues/${slug}/invite`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500/15 px-3 py-1.5 text-xs font-semibold text-primary-400 ring-1 ring-primary-500/20 transition hover:bg-primary-500/25"
              >
                <UserPlus className="size-3.5" />
                {locale === "fr" ? "Inviter" : "Invite"}
              </Link>
              <Link
                href={`/leagues/${slug}/settings`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:border-border-strong"
              >
                <Settings className="size-3.5" />
                {locale === "fr" ? "Réglages" : "Settings"}
              </Link>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
          <Users className="size-3" />
          {league.members.length} / {league.member_limit}
        </div>
      </header>

      {standings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center backdrop-blur">
          <p className="text-text-secondary">
            {locale === "fr"
              ? "Aucun pari validé pour l'instant. Le classement apparaîtra dès qu'un membre place et fait valider un pari."
              : "No validated bets yet. The leaderboard will populate as members place and validate bets."}
          </p>
        </div>
      ) : (
        <>
          {standings.length >= 1 && (
            <section className="mb-8">
              <LeaderboardPodium top3={standings.slice(0, 3)} />
            </section>
          )}
          <section>
            <StandingsTable
              entries={standings}
              highlightUserId={currentUserId}
              locale={locale === "fr" ? "fr" : "en"}
            />
          </section>
        </>
      )}
    </main>
  );
}
