"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2, X, Zap, Trophy, Target, Users, Check } from "lucide-react";
import { placeBet } from "@/lib/bets/place-bet";
import { POINTS_SCHEME } from "@/lib/bets/types";
import { Flag } from "@/components/team/flag";
import { useToast } from "@/components/ui/toast-provider";
import { useConfetti } from "@/lib/hooks/use-confetti";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Existing picks indexed by bet_type so the sheet can prefill each section and
 * switch the CTA to "Mettre à jour".
 */
export type QuickBetExistingPicks = Partial<{
  match_winner: { winner: "home" | "draw" | "away" };
  total_goals: { total: number };
  anytime_scorer: { players: { player_name: string }[] };
}>;

export type QuickBetMatch = {
  id: string;
  kickoff_at: string;
  status: string;
  home_team: {
    iso_code: string | null;
    name_fr: string;
    name_en: string;
    flag_emoji: string | null;
  } | null;
  away_team: {
    iso_code: string | null;
    name_fr: string;
    name_en: string;
    flag_emoji: string | null;
  } | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
};

type QuickBetCtx = {
  open: (match: QuickBetMatch, existing?: QuickBetExistingPicks) => void;
  close: () => void;
};

const QuickBetContext = createContext<QuickBetCtx | null>(null);

export function useQuickBet(): QuickBetCtx {
  const ctx = useContext(QuickBetContext);
  if (!ctx) return { open: () => {}, close: () => {} };
  return ctx;
}

type OpenState = { match: QuickBetMatch; existing: QuickBetExistingPicks };

export function QuickBetProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OpenState | null>(null);

  const ctx = useMemo<QuickBetCtx>(
    () => ({
      open: (m, existing) => setState({ match: m, existing: existing ?? {} }),
      close: () => setState(null),
    }),
    [],
  );

  return (
    <QuickBetContext.Provider value={ctx}>
      {children}
      {state && (
        <QuickBetSheet
          // Remount per match so prefilled state always resets correctly.
          key={state.match.id}
          match={state.match}
          existing={state.existing}
          locale={locale}
          onClose={() => setState(null)}
        />
      )}
    </QuickBetContext.Provider>
  );
}

function QuickBetSheet({
  match,
  existing,
  locale,
  onClose,
}: {
  match: QuickBetMatch;
  existing: QuickBetExistingPicks;
  locale: Locale;
  onClose: () => void;
}) {
  const fr = locale === "fr";
  const router = useRouter();
  const toast = useToast();
  const fireConfetti = useConfetti();

  const [winnerPick, setWinnerPick] = useState<"home" | "draw" | "away" | null>(
    existing.match_winner?.winner ?? null,
  );
  const [totalGoals, setTotalGoals] = useState<number | null>(
    existing.total_goals?.total ?? null,
  );
  const [scorers, setScorers] = useState<string[]>(() => {
    const base = ["", "", "", ""];
    existing.anytime_scorer?.players.forEach((p, i) => {
      if (i < 4) base[i] = p.player_name;
    });
    return base;
  });
  const [isPending, setIsPending] = useState(false);
  const [visible, setVisible] = useState(false);

  const isEditing =
    existing.match_winner != null ||
    existing.total_goals != null ||
    existing.anytime_scorer != null;

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  });

  function handleClose() {
    setVisible(false);
    window.setTimeout(onClose, 200);
  }

  const kickoff = new Date(match.kickoff_at);
  const lockTime = new Date(kickoff.getTime() - 60 * 60_000);
  const isLockedOut =
    match.status === "live" ||
    match.status === "finished" ||
    Date.now() >= lockTime.getTime();

  const homeName = match.home_team
    ? fr
      ? match.home_team.name_fr
      : match.home_team.name_en
    : (match.home_placeholder ?? "?");
  const awayName = match.away_team
    ? fr
      ? match.away_team.name_fr
      : match.away_team.name_en
    : (match.away_placeholder ?? "?");

  const dateStr = kickoff.toLocaleString(fr ? "fr-CA" : "en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  const lockStr = lockTime.toLocaleTimeString(fr ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

  const cleanScorers = scorers
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 4);
  const hasAny =
    winnerPick !== null || totalGoals !== null || cleanScorers.length > 0;

  async function handleSubmit() {
    if (!hasAny || isPending) return;
    setIsPending(true);

    const submissions: {
      bet_type: "match_winner" | "total_goals" | "anytime_scorer";
      payload: unknown;
    }[] = [];
    if (winnerPick !== null)
      submissions.push({ bet_type: "match_winner", payload: { winner: winnerPick } });
    if (totalGoals !== null)
      submissions.push({ bet_type: "total_goals", payload: { total: totalGoals } });
    if (cleanScorers.length > 0)
      submissions.push({
        bet_type: "anytime_scorer",
        payload: { players: cleanScorers.map((player_name) => ({ player_name })) },
      });

    let ok = 0;
    let firstError = "";
    for (const s of submissions) {
      const res = await placeBet({
        match_id: match.id,
        league_id: null,
        bet: { bet_type: s.bet_type, match_id: match.id, payload: s.payload } as never,
        stake_cents: 0,
        client_request_id: crypto.randomUUID(),
      });
      if (res.ok) ok++;
      else if (!firstError) firstError = res.message;
    }
    setIsPending(false);

    if (ok > 0) {
      fireConfetti("place");
      toast.success(
        isEditing
          ? fr
            ? "Pronostics mis à jour."
            : "Predictions updated."
          : fr
            ? "Pronostics enregistrés ! Modifiables jusqu'à 1h avant le match."
            : "Predictions saved! Editable up to 1h before kickoff.",
      );
      handleClose();
      router.refresh();
    } else {
      toast.error(firstError || (fr ? "Échec de l'enregistrement." : "Save failed."));
    }
  }

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={handleClose}
        aria-label={fr ? "Fermer" : "Close"}
        className={cn(
          "absolute inset-0 bg-abyss/80 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg transition-transform duration-200 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          visible
            ? "translate-y-0 sm:translate-y-[-50%]"
            : "translate-y-full sm:translate-y-[calc(-50%+24px)] sm:opacity-0",
        )}
      >
        <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[18px] border border-white/[0.12] bg-abyss/95 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:rounded-[16px]">
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden border-b border-white/[0.08] bg-gradient-to-br from-primary-500/[0.14] via-violet-500/[0.06] to-transparent px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
                  <Zap className="size-3" strokeWidth={2.5} />
                  {isEditing
                    ? fr
                      ? "Modifier le pronostic"
                      : "Edit prediction"
                    : fr
                      ? "Pronostic"
                      : "Prediction"}
                </div>
                <div className="flex items-center gap-2">
                  <Flag isoCode={match.home_team?.iso_code ?? null} size="sm" />
                  <h2 className="truncate font-display text-base font-semibold leading-tight text-text-primary sm:text-lg">
                    {homeName} <span className="text-text-tertiary">vs</span>{" "}
                    {awayName}
                  </h2>
                  <Flag isoCode={match.away_team?.iso_code ?? null} size="sm" />
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {dateStr}
                  {!isLockedOut && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span className="text-gold-400">
                        {fr ? `Verrou ${lockStr}` : `Locks ${lockStr}`}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={fr ? "Fermer" : "Close"}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {isLockedOut ? (
            <div className="p-6 text-center">
              <p className="text-sm text-text-secondary">
                {fr
                  ? "Paris fermés — moins d'1 heure avant le coup d'envoi."
                  : "Bets closed — less than 1 hour to kickoff."}
              </p>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <p className="text-xs leading-5 text-text-secondary">
                  {fr
                    ? "Remplis ce que tu veux — chaque pronostic rapporte des points séparément. Tu peux tout modifier jusqu'au verrou."
                    : "Fill in whatever you like — each prediction scores separately. Editable until the lock."}
                </p>

                <Section
                  icon={Trophy}
                  title={fr ? "Vainqueur" : "Winner"}
                  points={POINTS_SCHEME.match_winner}
                  done={winnerPick !== null}
                  locale={locale}
                >
                  <div className="grid grid-cols-3 gap-2">
                    <WinnerButton
                      active={winnerPick === "home"}
                      onClick={() => setWinnerPick(winnerPick === "home" ? null : "home")}
                      label={homeName}
                      iso={match.home_team?.iso_code ?? null}
                      badge="1"
                    />
                    <WinnerButton
                      active={winnerPick === "draw"}
                      onClick={() => setWinnerPick(winnerPick === "draw" ? null : "draw")}
                      label={fr ? "Match nul" : "Draw"}
                      iso={null}
                      badge="N"
                      isDraw
                    />
                    <WinnerButton
                      active={winnerPick === "away"}
                      onClick={() => setWinnerPick(winnerPick === "away" ? null : "away")}
                      label={awayName}
                      iso={match.away_team?.iso_code ?? null}
                      badge="2"
                    />
                  </div>
                </Section>

                <Section
                  icon={Target}
                  title={fr ? "Total de buts" : "Total goals"}
                  points={POINTS_SCHEME.total_goals_exact}
                  done={totalGoals !== null}
                  locale={locale}
                >
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((n) => {
                      const active = totalGoals === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setTotalGoals(active ? null : n)}
                          className={cn(
                            "rounded-[10px] border-2 py-2.5 font-display text-lg font-bold tabular-nums transition",
                            active
                              ? "border-primary-500 bg-primary-500/15 text-primary-200 shadow-glow-primary"
                              : "border-white/[0.1] bg-white/[0.04] text-text-secondary hover:border-white/[0.2] hover:text-text-primary",
                          )}
                        >
                          {n === 5 ? "5+" : n}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-text-tertiary">
                    {fr
                      ? `+${POINTS_SCHEME.total_goals_exact} si exact · +${POINTS_SCHEME.total_goals_close} si tu rates de 1`
                      : `+${POINTS_SCHEME.total_goals_exact} if exact · +${POINTS_SCHEME.total_goals_close} within 1`}
                  </p>
                </Section>

                <Section
                  icon={Users}
                  title={fr ? "Buteurs" : "Scorers"}
                  points={POINTS_SCHEME.anytime_scorer_each}
                  pointsSuffix={fr ? "/joueur" : "/player"}
                  done={cleanScorers.length > 0}
                  locale={locale}
                >
                  <p className="mb-2 text-[11px] text-text-tertiary">
                    {fr
                      ? `Jusqu'à 4 joueurs, de n'importe quelle équipe (${homeName} ou ${awayName}).`
                      : `Up to 4 players, from either team (${homeName} or ${awayName}).`}
                  </p>
                  <div className="grid gap-2">
                    {scorers.map((s, i) => (
                      <div key={i} className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-text-tertiary">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={s}
                          onChange={(e) => {
                            const next = [...scorers];
                            next[i] = e.target.value;
                            setScorers(next);
                          }}
                          placeholder={
                            fr ? `Buteur ${i + 1} · ex. Mbappé` : `Scorer ${i + 1} · e.g. Mbappé`
                          }
                          maxLength={80}
                          className="w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.5] py-2 pl-7 pr-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-500/50"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-text-tertiary">
                    {fr
                      ? `+${POINTS_SCHEME.anytime_scorer_each} pts par buteur trouvé · le nom de famille suffit`
                      : `+${POINTS_SCHEME.anytime_scorer_each} pts per correct scorer · last name is enough`}
                  </p>
                </Section>
              </div>

              {/* Footer / submit */}
              <div className="shrink-0 border-t border-white/[0.08] bg-abyss/80 p-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasAny || isPending}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-3.5 text-sm font-bold transition",
                    hasAny && !isPending
                      ? "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400"
                      : "cursor-not-allowed bg-white/[0.06] text-text-tertiary",
                  )}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Zap className="size-4" strokeWidth={2.5} />
                  )}
                  {isEditing
                    ? fr
                      ? "Mettre à jour mes pronos"
                      : "Update my predictions"
                    : fr
                      ? "Enregistrer mes pronos"
                      : "Save my predictions"}
                </button>
                <p className="mt-2 text-center text-[10px] leading-4 text-text-tertiary">
                  {fr
                    ? "Gratuit · modifiable jusqu'à 1h avant · le pot récompense les meilleurs"
                    : "Free · editable up to 1h before · the pot rewards the best"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  points,
  pointsSuffix,
  done,
  locale,
  children,
}: {
  icon: typeof Trophy;
  title: string;
  points: number;
  pointsSuffix?: string;
  done: boolean;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-[6px] ring-1 transition",
            done
              ? "bg-primary-500/15 text-primary-300 ring-primary-500/30"
              : "bg-white/[0.05] text-text-tertiary ring-white/[0.08]",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={2.5} /> : <Icon className="size-3.5" strokeWidth={2} />}
        </span>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold tabular-nums text-text-secondary">
          +{points}
          {pointsSuffix ?? ""}
        </span>
      </div>
      {children}
    </section>
  );
}

function WinnerButton({
  active,
  onClick,
  label,
  iso,
  badge,
  isDraw = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  iso: string | null;
  badge: string;
  isDraw?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-[10px] border-2 px-2 py-3 transition",
        active
          ? "border-primary-500 bg-primary-500/15 shadow-glow-primary"
          : "border-white/[0.1] bg-white/[0.04] hover:border-white/[0.2] hover:bg-white/[0.07]",
      )}
    >
      <span
        className={cn(
          "absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
          active ? "bg-primary-500 text-abyss" : "bg-white/10 text-text-tertiary",
        )}
      >
        {badge}
      </span>
      {isDraw ? (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            active ? "bg-primary-500/20" : "bg-white/[0.06]",
          )}
        >
          <span className="font-display text-base font-bold text-text-secondary">
            X
          </span>
        </span>
      ) : (
        <Flag isoCode={iso} size="lg" />
      )}
      <span
        className={cn(
          "max-w-full truncate text-center text-xs font-semibold",
          active ? "text-text-primary" : "text-text-secondary",
        )}
      >
        {label}
      </span>
    </button>
  );
}
