import { Flag } from "@/components/team/flag";
import { Crown } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import type { TeamLite } from "./predict-board";

export function ChampionBanner({
  championId,
  teamById,
  locale,
}: {
  championId: string | null;
  teamById: Map<string, TeamLite>;
  locale: Locale;
}) {
  if (!championId) return null;
  const t = teamById.get(championId);
  if (!t) return null;
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-gold-500/40 bg-gradient-to-br from-gold-500/[0.18] via-primary-500/[0.05] to-transparent p-5 backdrop-blur-xl sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-gold-500/25 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <Crown className="size-10 text-gold-300" strokeWidth={1.5} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
            {locale === "fr" ? "Ton scénario" : "Your scenario"}
          </div>
          <h3 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {locale === "fr"
              ? `${t.name_fr} soulève la Coupe`
              : `${t.name_en} lifts the Cup`}
          </h3>
        </div>
        <div className="ml-auto">
          <Flag isoCode={t.iso_code} size="2xl" />
        </div>
      </div>
    </section>
  );
}
