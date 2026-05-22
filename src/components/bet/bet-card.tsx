import type { BetListItem } from "@/lib/bets/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, X, Coins, Trophy } from "lucide-react";
import type { Locale } from "@/i18n/routing";

/**
 * Signature component: BetCard
 *
 * Left border colored by status:
 *  gray (pending)  / gold (validated)  / green (won)  / red (lost)  / violet (live)
 */
export function BetCard({
  bet,
  locale,
}: {
  bet: BetListItem;
  locale: Locale;
}) {
  const borderColor = statusBorderColor(bet.status, bet.result);
  const homeName =
    bet.match?.home_team
      ? locale === "fr"
        ? bet.match.home_team.name_fr
        : bet.match.home_team.name_en
      : "—";
  const awayName =
    bet.match?.away_team
      ? locale === "fr"
        ? bet.match.away_team.name_fr
        : bet.match.away_team.name_en
      : "—";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-border-subtle bg-surface-1/60 p-5 backdrop-blur transition hover:bg-surface-2/60",
      )}
    >
      {/* Status colored left bar */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          borderColor,
        )}
      />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <BetTypeBadge type={bet.bet_type} locale={locale} />
            <StatusPill status={bet.status} result={bet.result} locale={locale} />
          </div>

          {bet.match && (
            <Link
              href={`/matches/${bet.match.id}`}
              className="mt-3 block font-display text-base font-semibold tracking-tight text-text-primary hover:text-primary-400"
            >
              <span className="mr-1.5" aria-hidden>
                {bet.match.home_team?.flag_emoji ?? "🏳️"}
              </span>
              {homeName}
              <span className="mx-2 text-text-tertiary">vs</span>
              {awayName}
              <span className="ml-1.5" aria-hidden>
                {bet.match.away_team?.flag_emoji ?? "🏳️"}
              </span>
            </Link>
          )}

          <div className="mt-2 text-xs text-text-tertiary">
            <BetPredictionLabel
              betType={bet.bet_type}
              payload={bet.payload}
              homeName={homeName}
              awayName={awayName}
              locale={locale}
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <Coins className="size-3" />
            <span className="font-mono tabular-nums">{bet.stake_cents / 100}</span>
          </div>
          {bet.status === "settled" && (
            <div
              className={cn(
                "flex items-center gap-1 font-display font-semibold tabular-nums",
                bet.result === "won" ? "text-primary-500" : "text-text-tertiary",
              )}
            >
              {bet.result === "won" && <Trophy className="size-3.5" />}
              <span>{bet.points} pts</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function statusBorderColor(status: string, result: string | null): string {
  if (status === "settled" && result === "won") return "bg-primary-500";
  if (status === "settled" && result === "lost") return "bg-error";
  if (status === "validated") return "bg-gold-500";
  if (status === "rejected") return "bg-error";
  if (status === "refunded") return "bg-text-tertiary";
  return "bg-text-tertiary";
}

function BetTypeBadge({ type, locale }: { type: string; locale: Locale }) {
  const labels: Record<string, { fr: string; en: string }> = {
    match_winner: { fr: "Vainqueur", en: "Winner" },
    exact_score: { fr: "Score exact", en: "Exact score" },
    first_scorer: { fr: "1er buteur", en: "1st scorer" },
    anytime_scorer: { fr: "Buteur", en: "Scorer" },
    both_teams_score: { fr: "Les 2 marquent", en: "Both score" },
    over_under: { fr: "+/− 2.5", en: "O/U 2.5" },
    tournament_winner: { fr: "Champion", en: "Champion" },
    top_scorer: { fr: "Top scorer", en: "Top scorer" },
  };
  return (
    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
      {labels[type]?.[locale] ?? type}
    </span>
  );
}

function StatusPill({
  status,
  result,
  locale,
}: {
  status: string;
  result: string | null;
  locale: Locale;
}) {
  if (status === "settled" && result === "won") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-400">
        <CheckCircle2 className="size-3" />
        {locale === "fr" ? "Gagné" : "Won"}
      </span>
    );
  }
  if (status === "settled" && result === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
        <X className="size-3" />
        {locale === "fr" ? "Perdu" : "Lost"}
      </span>
    );
  }
  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
        <CheckCircle2 className="size-3" />
        {locale === "fr" ? "Validé" : "Validated"}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
        <X className="size-3" />
        {locale === "fr" ? "Rejeté" : "Rejected"}
      </span>
    );
  }
  // pending_payment / paid → en attente admin
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
      <Clock className="size-3" />
      {locale === "fr" ? "En attente" : "Pending"}
    </span>
  );
}

function BetPredictionLabel({
  betType,
  payload,
  homeName,
  awayName,
  locale,
}: {
  betType: string;
  payload: unknown;
  homeName: string;
  awayName: string;
  locale: Locale;
}) {
  const p = payload as Record<string, unknown>;

  if (betType === "match_winner") {
    const winner = p?.winner as string | undefined;
    if (winner === "home") return <>{locale === "fr" ? `Victoire ${homeName}` : `${homeName} wins`}</>;
    if (winner === "away") return <>{locale === "fr" ? `Victoire ${awayName}` : `${awayName} wins`}</>;
    if (winner === "draw") return <>{locale === "fr" ? "Match nul" : "Draw"}</>;
  }
  if (betType === "exact_score") {
    return (
      <span className="font-mono tabular-nums">
        {String(p?.home ?? "?")} - {String(p?.away ?? "?")}
      </span>
    );
  }
  return <>—</>;
}
