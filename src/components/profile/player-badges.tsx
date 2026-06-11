import { Award } from "lucide-react";
import { SectionPanel } from "@/components/layout/section-panel";
import type { PlayerAchievements } from "@/lib/profile/achievements";
import type { Locale } from "@/i18n/routing";

type Badge = { emoji: string; label: string; sub?: string };

function buildBadges(a: PlayerAchievements, fr: boolean): Badge[] {
  const b: Badge[] = [];
  if (a.current_streak >= 2)
    b.push({ emoji: "🔥", label: fr ? "En feu" : "On fire", sub: `${a.current_streak}` });
  if (a.exact_count >= 1)
    b.push({
      emoji: "🎯",
      label: fr ? "Carton plein" : "Bullseye",
      sub: a.exact_count > 1 ? `×${a.exact_count}` : undefined,
    });
  if (a.scorer_count >= 1)
    b.push({
      emoji: "⚽",
      label: fr ? "Sniper" : "Sniper",
      sub: a.scorer_count > 1 ? `×${a.scorer_count}` : undefined,
    });
  const tier =
    a.total_points >= 100
      ? { e: "🏆", t: fr ? "Or" : "Gold" }
      : a.total_points >= 50
        ? { e: "🥈", t: fr ? "Argent" : "Silver" }
        : a.total_points >= 10
          ? { e: "🥉", t: fr ? "Bronze" : "Bronze" }
          : null;
  if (tier) b.push({ emoji: tier.e, label: `${fr ? "Pronostiqueur" : "Predictor"} ${tier.t}` });
  if (a.best_streak >= 3)
    b.push({ emoji: "📈", label: fr ? "Record de série" : "Best streak", sub: `${a.best_streak}` });
  if (a.won_count >= 10)
    b.push({ emoji: "✅", label: fr ? "Bons pronos" : "Correct picks", sub: `${a.won_count}` });
  return b;
}

/** Earned badges + streaks for a profile. Renders nothing until 1+ is earned. */
export function PlayerBadges({
  achievements,
  locale,
}: {
  achievements: PlayerAchievements | null;
  locale: Locale;
}) {
  if (!achievements) return null;
  const fr = locale === "fr";
  const badges = buildBadges(achievements, fr);
  if (badges.length === 0) return null;

  return (
    <SectionPanel icon={Award} accent="gold" title={fr ? "Badges & séries" : "Badges & streaks"}>
      <div className="flex flex-wrap gap-2">
        {badges.map((b, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/[0.1] px-3 py-1.5 text-sm font-semibold text-text-primary"
          >
            <span aria-hidden className="text-base leading-none">
              {b.emoji}
            </span>
            {b.label}
            {b.sub && (
              <span className="font-mono text-xs tabular-nums text-gold-300">{b.sub}</span>
            )}
          </span>
        ))}
      </div>
    </SectionPanel>
  );
}
