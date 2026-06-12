import { Hourglass } from "lucide-react";
import { MatchCountdown } from "@/components/match/match-countdown";
import type { Locale } from "@/i18n/routing";

/**
 * Shown to a player who can still bet AFTER the global lock (late joiner, or
 * admin-unlocked) — their personal window (`my_deadline_at`) ticking down.
 * Render only when `buyIn.deadline_passed && buyIn.can_bet`.
 */
export function GraceWindowBanner({
  targetAt,
  locale,
}: {
  targetAt: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  return (
    <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold-500/35 bg-gradient-to-r from-gold-500/[0.15] via-primary-500/[0.05] to-transparent px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30">
          <Hourglass className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
            {fr ? "Ta fenêtre de pronostic" : "Your prediction window"}
          </div>
          <div className="text-sm font-semibold text-text-primary">
            {fr
              ? "Pronostique les matchs à venir avant la fermeture. Les matchs déjà joués comptent 0 pt."
              : "Predict upcoming matches before it closes. Already-played matches score 0."}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-sm border border-gold-500/30 bg-abyss/40 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {fr ? "Il te reste" : "Time left"}
        </span>
        <MatchCountdown
          targetAt={targetAt}
          locale={locale}
          urgentWithinHours={1}
          showIcon={false}
          className="text-sm"
        />
      </div>
    </section>
  );
}
