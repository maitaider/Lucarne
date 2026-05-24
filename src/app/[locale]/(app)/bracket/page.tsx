import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { listMatches } from "@/lib/matches/queries";
import { getMyBuyInStatus } from "@/lib/profile/buy-in";
import { getMyTournamentPrediction } from "@/lib/predictions/queries";
import { BracketBuilder } from "@/components/bracket/bracket-builder";
import { Trophy } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function BracketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [allMatches, buyIn, prediction] = await Promise.all([
    listMatches(),
    getMyBuyInStatus(),
    getMyTournamentPrediction(),
  ]);

  // Build the team list scoped to this tournament (deduped) for the
  // group-ranker rows.
  const teamMap = new Map<
    string,
    {
      id: string;
      fifa_code: string;
      iso_code: string | null;
      name_fr: string;
      name_en: string;
    }
  >();
  const groupTeams: Record<string, typeof teamMap extends Map<string, infer V> ? V[] : never> = {};
  for (const m of allMatches) {
    if (m.stage !== "group" || !m.group_label) continue;
    for (const t of [m.home_team, m.away_team]) {
      if (!t) continue;
      if (!teamMap.has(t.id)) {
        teamMap.set(t.id, {
          id: t.id,
          fifa_code: t.fifa_code,
          iso_code: t.iso_code,
          name_fr: t.name_fr,
          name_en: t.name_en,
        });
      }
      const list = (groupTeams[m.group_label] ??= []);
      if (!list.some((x) => x.id === t.id)) list.push(teamMap.get(t.id)!);
    }
  }

  // Keep only the knockout schedule (with placeholders) for the builder.
  const knockoutSchedule = allMatches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number ?? 0,
      stage: m.stage as
        | "r32"
        | "r16"
        | "qf"
        | "sf"
        | "third_place"
        | "final",
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
      kickoff_at: m.kickoff_at,
    }));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8 lg:px-8">
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
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/35 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-300 shadow-glow-gold">
            <Trophy className="size-3.5" strokeWidth={1.7} />
            {L === "fr" ? "Mon scénario" : "My scenario"}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {L === "fr"
              ? "Bâtis ton scénario du Mondial"
              : "Build your World Cup scenario"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {L === "fr"
              ? "Classe chaque groupe (1ᵉʳ → 4ᵉ), avance tes équipes de tour en tour jusqu'à ton champion. Modifiable jusqu'à 1 h avant le coup d'envoi du 1ᵉʳ match. Tes pronos par match (page Pronos) restent disponibles pour grappiller des points en cours de tournoi."
              : "Rank each group (1st → 4th), advance teams round by round to your champion. Editable until 1 h before the first kickoff. Your per-match picks (Pronos page) still earn extra points during the tournament."}
          </p>
        </div>
      </header>

      <BracketBuilder
        groupTeams={groupTeams}
        knockoutSchedule={knockoutSchedule}
        initialPrediction={prediction}
        canEdit={buyIn.can_bet && !prediction.locked_at}
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
