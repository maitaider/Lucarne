import { Crown, Medal, Trophy } from "lucide-react";
import { Flag } from "@/components/team/flag";
import type { BracketTeam } from "@/lib/profile/public-profile";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

function teamLabel(t: BracketTeam, fr: boolean): string {
  return (fr ? t.name_fr : t.name_en) ?? t.fifa ?? "?";
}

/**
 * A player's predicted FINAL FOUR, read-only — the headline of their "phase
 * finale" bracket. Champion gets a prominent gold card; the runner-up and the
 * two semi-finalists sit below. Server-rendered (Flag is the only client bit).
 * Base `grid-cols-1` so it never overflows on mobile.
 */
export function BracketSummary({
  teams,
  locale,
  canSee,
}: {
  teams: BracketTeam[];
  locale: Locale;
  canSee: boolean;
}) {
  const fr = locale === "fr";
  const champion = teams.find((t) => t.rank === 1) ?? null;
  const runnerUp = teams.find((t) => t.rank === 2) ?? null;
  const semis = teams.filter((t) => t.rank === 3);

  if (teams.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center text-sm text-text-secondary">
        {canSee
          ? fr
            ? "Aucun pronostic de phase finale."
            : "No knockout-stage predictions yet."
          : fr
            ? "Le bracket de ce joueur sera visible après le verrouillage (1 h avant le 1er match)."
            : "This player's bracket becomes visible after the lock (1h before the first match)."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Champion — the headline pick */}
      {champion && (
        <div className="relative isolate overflow-hidden rounded-md border border-gold-500/30 bg-gradient-to-br from-gold-500/[0.12] via-gold-500/[0.04] to-transparent p-4 sm:p-5">
          <Trophy
            aria-hidden
            className="pointer-events-none absolute -right-5 -top-5 -z-10 size-28 text-gold-500/[0.08]"
            strokeWidth={1}
          />
          <div className="flex items-center gap-3.5">
            <Flag isoCode={champion.iso} size="xl" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-300">
                <Crown className="size-3.5" strokeWidth={2.2} />
                {fr ? "Champion pronostiqué" : "Predicted champion"}
              </div>
              <div className="mt-0.5 truncate font-display text-2xl font-bold text-text-primary sm:text-3xl">
                {teamLabel(champion, fr)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Runner-up + the two semi-finalists */}
      {(runnerUp || semis.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {runnerUp && (
            <Tier
              label={fr ? "Finaliste" : "Runner-up"}
              tone="silver"
              teams={[runnerUp]}
              fr={fr}
            />
          )}
          {semis.length > 0 && (
            <div className="sm:col-span-2">
              <Tier
                label={fr ? "Demi-finalistes" : "Semi-finalists"}
                tone="bronze"
                teams={semis}
                fr={fr}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tier({
  label,
  tone,
  teams,
  fr,
}: {
  label: string;
  tone: "silver" | "bronze";
  teams: BracketTeam[];
  fr: boolean;
}) {
  const labelTone =
    tone === "silver" ? "text-text-secondary" : "text-text-tertiary";
  return (
    <div className="h-full rounded-md border border-white/[0.08] bg-white/[0.025] p-3">
      <div
        className={cn(
          "mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
          labelTone,
        )}
      >
        <Medal className="size-3" strokeWidth={2} />
        {label}
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {teams.map((t) => (
          <li key={t.team_id} className="flex min-w-0 items-center gap-2">
            <Flag isoCode={t.iso} size="sm" />
            <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
              {teamLabel(t, fr)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
