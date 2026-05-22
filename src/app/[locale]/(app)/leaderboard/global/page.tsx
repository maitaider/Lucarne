import { setRequestLocale } from "next-intl/server";
import { getGlobalStandings } from "@/lib/leagues/queries";
import { LeaderboardPodium } from "@/components/leaderboard/podium";
import { StandingsTable } from "@/components/leaderboard/standings-table";
import { getSupabaseServer } from "@/lib/supabase/server";

export default async function GlobalLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const standings = await getGlobalStandings();

  let currentUserId: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          {locale === "fr" ? "Classement global" : "Global leaderboard"}
        </h1>
        <p className="mt-2 text-text-secondary">
          {locale === "fr"
            ? "Tous les joueurs Lucarne, tous classements confondus."
            : "All Lucarne players, across leagues."}
        </p>
      </header>

      {standings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center backdrop-blur">
          <p className="text-text-secondary">
            {locale === "fr"
              ? "Pas encore de classement. Les premiers paris résolus alimenteront le board."
              : "No leaderboard yet. The first settled bets will populate it."}
          </p>
        </div>
      ) : (
        <>
          {standings.length >= 1 && (
            <section className="mb-8">
              <LeaderboardPodium top3={standings.slice(0, 3)} />
            </section>
          )}
          <StandingsTable
            entries={standings}
            highlightUserId={currentUserId}
            locale={locale === "fr" ? "fr" : "en"}
          />
        </>
      )}
    </main>
  );
}
