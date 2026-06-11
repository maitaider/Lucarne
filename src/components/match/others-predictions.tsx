import { getMatchPredictions } from "@/lib/bets/match-predictions";
import { getCurrentUser } from "@/lib/profile/queries";
import { Link } from "@/i18n/navigation";
import { Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Group predictions for a match — every player's score pick, shown at all
 * times. No kickoff gate, per the product decision to drop the anti-cheat
 * reveal on 2026-06-10 (the `match_predictions` RPC no longer gates either).
 */
export async function OthersPredictions({
  matchId,
  locale,
}: {
  matchId: string;
  locale: Locale;
}) {
  const fr = locale === "fr";

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-surface-1/[0.62] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
          <Users className="size-4 text-primary-400" strokeWidth={1.8} />
          {fr ? "Pronos du groupe" : "Group predictions"}
        </h2>
      </div>
      <div className="px-5 py-5">
        <PredictionsList matchId={matchId} locale={locale} />
      </div>
    </section>
  );
}

async function PredictionsList({
  matchId,
  locale,
}: {
  matchId: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [preds, me] = await Promise.all([
    getMatchPredictions(matchId),
    getCurrentUser(),
  ]);

  if (preds.length === 0) {
    return (
      <p className="px-2 py-3 text-center text-xs text-text-tertiary">
        {fr
          ? "Personne d'autre n'a pronostiqué ce match."
          : "No one else predicted this match."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.05]">
      {preds.map((p) => {
        const isMe = me?.id === p.user_id;
        const name = p.display_name || p.username;
        const initials = (name || "?").slice(0, 2).toUpperCase();
        return (
          <li
            key={p.user_id}
            className={cn(
              "flex items-center gap-3 px-1 py-2.5",
              isMe && "rounded-md bg-primary-500/[0.06]",
            )}
          >
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatar_url}
                alt=""
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-white/[0.12]"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-display text-[11px] font-bold uppercase text-text-primary ring-1 ring-white/[0.12]">
                {initials}
              </span>
            )}

            <Link
              href={`/u/${p.username}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              {name}
              {isMe && (
                <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300">
                  {fr ? "toi" : "you"}
                </span>
              )}
            </Link>

            <span className="shrink-0 font-display text-base font-bold tabular-nums text-text-primary">
              {p.pred_home}
              <span className="mx-1 text-text-tertiary">–</span>
              {p.pred_away}
            </span>

            {p.status === "settled" && (
              <span
                className={cn(
                  "flex w-14 shrink-0 items-center justify-end gap-1 font-mono text-xs tabular-nums",
                  p.points > 0 ? "text-primary-300" : "text-text-tertiary",
                )}
              >
                {p.points > 0 && <Trophy className="size-3" strokeWidth={2} />}
                {p.points > 0 ? `+${p.points}` : "0"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
