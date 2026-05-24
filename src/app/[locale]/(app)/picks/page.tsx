import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { getMyPicksByMatch } from "@/lib/bets/my-picks";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { PicksBoard } from "@/components/picks/picks-board";
import { Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function PicksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [allMatches, myPicksByMatch, buyIn] = await Promise.all([
    listMatches(),
    getMyPicksByMatch(),
    getMyBuyInStatus(),
  ]);

  // Serialize picks Map → plain object for the client boundary.
  const picksSnapshot: Record<
    string,
    {
      bet_type: string;
      payload: unknown;
      status: string;
    }[]
  > = {};
  for (const [matchId, picks] of myPicksByMatch.entries()) {
    picksSnapshot[matchId] = picks.map((p) => ({
      bet_type: p.bet_type,
      payload: p.payload,
      status: p.status,
    }));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="relative mb-6 overflow-hidden rounded-[12px] border border-white/[0.13] bg-abyss/[0.8] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
        <Image
          src="/marketing/lucarne-hero-stadium.jpg"
          alt=""
          fill
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.2]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-primary-500/35 bg-primary-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300 shadow-glow-primary">
            <Sparkles className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Pronos en série" : "Pick'em mode"}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr"
              ? "Tous tes pronostics sur une seule page"
              : "Every pick on one page"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "Un clic = ton choix de vainqueur. Tape « + plus » pour ajouter buts totaux et buteurs. Tout se sauvegarde tout seul, modifiable jusqu'à 1 h avant chaque match."
              : "One tap = your winner pick. Hit “+ more” to add total goals and scorers. Auto-saves as you go, editable up to 1 h before each match."}
          </p>
        </div>
      </header>

      <PicksBoard
        matches={allMatches}
        initialPicks={picksSnapshot}
        canBet={buyIn.can_bet}
        buyInAmountCents={buyIn.amount_cents}
        currency={buyIn.settings.currency}
        deadlineAt={buyIn.deadline_at}
        deadlinePassed={buyIn.deadline_passed}
        locale={L}
      />
    </main>
  );
}
