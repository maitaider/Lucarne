"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Loader2,
  X,
  Zap,
  Trophy,
  Target,
  Users,
} from "lucide-react";
import { placeBet } from "@/lib/bets/place-bet";
import { POINTS_SCHEME } from "@/lib/bets/types";
import { Flag } from "@/components/team/flag";
import { useToast } from "@/components/ui/toast-provider";
import { useConfetti } from "@/lib/hooks/use-confetti";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * Existing picks indexed by bet_type so the sheet can prefill the right tab
 * and switch the CTA from "Confirmer" to "Mettre à jour".
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
  if (!ctx) {
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}

type OpenState = {
  match: QuickBetMatch;
  existing: QuickBetExistingPicks;
};

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
          match={state.match}
          existing={state.existing}
          locale={locale}
          onClose={() => setState(null)}
        />
      )}
    </QuickBetContext.Provider>
  );
}

type Tab = "winner" | "goals" | "scorer";

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
  const router = useRouter();
  const toast = useToast();
  const fireConfetti = useConfetti();

  // Initial tab = first one with an existing pick, else "winner"
  const initialTab: Tab = existing.match_winner
    ? "winner"
    : existing.total_goals
      ? "goals"
      : existing.anytime_scorer
        ? "scorer"
        : "winner";

  const [tab, setTab] = useState<Tab>(initialTab);
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

  // Per-tab "already placed" indicator
  const hasExisting: Record<Tab, boolean> = {
    winner: existing.match_winner != null,
    goals: existing.total_goals != null,
    scorer: existing.anytime_scorer != null,
  };

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
  const lockTime = new Date(kickoff.getTime() - 60 * 60_000); // T-1h
  const isLockedOut =
    match.status === "live" ||
    match.status === "finished" ||
    Date.now() >= lockTime.getTime();

  const homeName = match.home_team
    ? locale === "fr"
      ? match.home_team.name_fr
      : match.home_team.name_en
    : (match.home_placeholder ?? "?");
  const awayName = match.away_team
    ? locale === "fr"
      ? match.away_team.name_fr
      : match.away_team.name_en
    : (match.away_placeholder ?? "?");

  const dateStr = kickoff.toLocaleString(
    locale === "fr" ? "fr-CA" : "en-CA",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    },
  );
  const lockStr = lockTime.toLocaleTimeString(
    locale === "fr" ? "fr-CA" : "en-CA",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    },
  );

  function canSubmit(): boolean {
    if (tab === "winner") return winnerPick !== null;
    if (tab === "goals") return totalGoals !== null;
    if (tab === "scorer") return scorers.some((s) => s.trim().length >= 2);
    return false;
  }

  async function handleSubmit() {
    if (!canSubmit() || isPending) return;
    setIsPending(true);

    type BetPayload = {
      bet_type: "match_winner" | "total_goals" | "anytime_scorer";
      match_id: string;
      payload: unknown;
    };
    let bet: BetPayload;
    if (tab === "winner") {
      bet = {
        bet_type: "match_winner",
        match_id: match.id,
        payload: { winner: winnerPick },
      };
    } else if (tab === "goals") {
      bet = {
        bet_type: "total_goals",
        match_id: match.id,
        payload: { total: totalGoals! },
      };
    } else {
      const players = scorers
        .map((s) => s.trim())
        .filter((s) => s.length >= 2)
        .slice(0, 4)
        .map((player_name) => ({ player_name }));
      bet = {
        bet_type: "anytime_scorer",
        match_id: match.id,
        payload: { players },
      };
    }

    const res = await placeBet({
      match_id: match.id,
      league_id: null,
      bet: bet as never,
      stake_cents: 0,
      client_request_id: crypto.randomUUID(),
    });
    setIsPending(false);

    if (res.ok) {
      fireConfetti("place");
      const wasUpdate = hasExisting[tab];
      toast.success(
        wasUpdate
          ? locale === "fr"
            ? "Pronostic mis à jour."
            : "Pick updated."
          : locale === "fr"
            ? "Pronostic enregistré ! Tu peux le modifier jusqu'à 1h avant le match."
            : "Bet recorded! You can edit it up to 1 hour before kickoff.",
      );
      handleClose();
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  const tabs: { key: Tab; icon: typeof Trophy; fr: string; en: string; pts: number }[] = [
    {
      key: "winner",
      icon: Trophy,
      fr: "Vainqueur",
      en: "Winner",
      pts: POINTS_SCHEME.match_winner,
    },
    {
      key: "goals",
      icon: Target,
      fr: "Total de buts",
      en: "Total goals",
      pts: POINTS_SCHEME.total_goals_exact,
    },
    {
      key: "scorer",
      icon: Users,
      fr: "Buteurs",
      en: "Scorers",
      pts: POINTS_SCHEME.anytime_scorer_each,
    },
  ];

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={handleClose}
        aria-label={locale === "fr" ? "Fermer" : "Close"}
        className={cn(
          "absolute inset-0 bg-abyss/80 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-xl transition-transform duration-200 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          visible
            ? "translate-y-0 sm:translate-y-[-50%]"
            : "translate-y-full sm:translate-y-[calc(-50%+24px)] sm:opacity-0",
        )}
      >
        <div className="relative overflow-hidden rounded-t-[16px] border border-white/[0.12] bg-abyss/95 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:rounded-[12px]">
          {/* Header */}
          <div className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-br from-primary-500/[0.12] via-violet-500/[0.06] to-transparent px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-400 ring-1 ring-primary-500/30">
                  <Zap className="size-3" strokeWidth={2.5} />
                  {locale === "fr" ? "Pronostic" : "Quick bet"}
                </div>
                <h2 className="font-display text-lg font-semibold leading-tight text-text-primary">
                  {homeName}{" "}
                  <span className="text-text-tertiary">vs</span> {awayName}
                </h2>
                <p className="mt-1 text-xs text-text-tertiary">
                  {dateStr}
                  {!isLockedOut && (
                    <>
                      <span className="mx-1.5 text-text-tertiary">·</span>
                      <span className="text-gold-400">
                        {locale === "fr"
                          ? `Lock ${lockStr}`
                          : `Locks at ${lockStr}`}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={locale === "fr" ? "Fermer" : "Close"}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {isLockedOut ? (
            <div className="p-6 text-center">
              <p className="text-sm text-text-secondary">
                {locale === "fr"
                  ? "Paris fermés — moins d'1 heure avant le coup d'envoi."
                  : "Bets closed — less than 1 hour to kickoff."}
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* Tabs */}
              <div className="inline-flex w-full rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-1">
                {tabs.map((t) => {
                  const isActive = tab === t.key;
                  const Icon = t.icon;
                  const hasPick = hasExisting[t.key];
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "relative flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition",
                        isActive
                          ? "bg-primary-500 text-abyss shadow-glow-primary"
                          : "text-text-secondary hover:text-text-primary",
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={2} />
                      <span className="hidden sm:inline">
                        {locale === "fr" ? t.fr : t.en}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums",
                          isActive
                            ? "bg-abyss/30 text-abyss"
                            : "bg-white/[0.06] text-text-tertiary",
                        )}
                      >
                        +{t.pts}
                      </span>
                      {hasPick && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute right-1 top-1 size-1.5 rounded-full",
                            isActive ? "bg-abyss" : "bg-primary-400",
                          )}
                          title={
                            locale === "fr"
                              ? "Pronostic déjà placé"
                              : "Already picked"
                          }
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab body */}
              {tab === "winner" && (
                <WinnerPicker
                  match={match}
                  homeName={homeName}
                  awayName={awayName}
                  selected={winnerPick}
                  onSelect={setWinnerPick}
                  locale={locale}
                />
              )}

              {tab === "goals" && (
                <TotalGoalsPicker
                  selected={totalGoals}
                  onSelect={setTotalGoals}
                  locale={locale}
                />
              )}

              {tab === "scorer" && (
                <ScorerPicker
                  scorers={scorers}
                  onChange={setScorers}
                  homeName={homeName}
                  awayName={awayName}
                  locale={locale}
                />
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit() || isPending}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-3.5 text-sm font-bold transition",
                  canSubmit() && !isPending
                    ? "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400"
                    : "bg-white/[0.06] text-text-tertiary",
                )}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Zap className="size-4" strokeWidth={2.5} />
                )}
                {hasExisting[tab]
                  ? locale === "fr"
                    ? "Mettre à jour"
                    : "Update pick"
                  : locale === "fr"
                    ? "Valider mon pronostic"
                    : "Confirm prediction"}
              </button>

              <p className="text-center text-[10px] leading-4 text-text-tertiary">
                {locale === "fr"
                  ? "Gratuit · modifiable jusqu'à 1h avant le coup d'envoi · points cumulés → top 3 partage la cagnotte finale"
                  : "Free · editable up to 1h before kickoff · points add up → top 3 share the final pot"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-pickers                                                               */
/* -------------------------------------------------------------------------- */

function WinnerPicker({
  match,
  homeName,
  awayName,
  selected,
  onSelect,
  locale,
}: {
  match: QuickBetMatch;
  homeName: string;
  awayName: string;
  selected: "home" | "draw" | "away" | null;
  onSelect: (s: "home" | "draw" | "away") => void;
  locale: Locale;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {locale === "fr" ? "Qui va gagner ?" : "Who will win?"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <WinnerButton
          active={selected === "home"}
          onClick={() => onSelect("home")}
          label={homeName}
          iso={match.home_team?.iso_code ?? null}
          badge="1"
        />
        <WinnerButton
          active={selected === "draw"}
          onClick={() => onSelect("draw")}
          label={locale === "fr" ? "Match nul" : "Draw"}
          iso={null}
          badge="N"
          isDraw
        />
        <WinnerButton
          active={selected === "away"}
          onClick={() => onSelect("away")}
          label={awayName}
          iso={match.away_team?.iso_code ?? null}
          badge="2"
        />
      </div>
    </div>
  );
}

function TotalGoalsPicker({
  selected,
  onSelect,
  locale,
}: {
  selected: number | null;
  onSelect: (n: number) => void;
  locale: Locale;
}) {
  const choices = [0, 1, 2, 3, 4, 5];
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {locale === "fr"
          ? "Combien de buts au total dans le match ?"
          : "How many goals in the match?"}
      </p>
      <div className="grid grid-cols-6 gap-2">
        {choices.map((n) => {
          const active = selected === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                "rounded-[10px] border-2 py-3 font-display text-xl font-bold tabular-nums transition",
                active
                  ? "border-primary-500 bg-primary-500/15 text-primary-200 shadow-glow-primary"
                  : "border-white/[0.1] bg-white/[0.04] text-text-secondary hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-text-primary",
              )}
            >
              {n === 5 ? "5+" : n}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-text-tertiary">
        {locale === "fr"
          ? `+${POINTS_SCHEME.total_goals_exact} pts si exact · +${POINTS_SCHEME.total_goals_close} pts si tu rates de 1`
          : `+${POINTS_SCHEME.total_goals_exact} pts if exact · +${POINTS_SCHEME.total_goals_close} pts within 1`}
      </p>
    </div>
  );
}

function ScorerPicker({
  scorers,
  onChange,
  homeName,
  awayName,
  locale,
}: {
  scorers: string[];
  onChange: (s: string[]) => void;
  homeName: string;
  awayName: string;
  locale: Locale;
}) {
  function setAt(i: number, v: string) {
    const next = [...scorers];
    next[i] = v;
    onChange(next);
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {locale === "fr"
          ? "Qui va marquer ? Jusqu'à 4 joueurs."
          : "Who will score? Up to 4 players."}
      </p>
      <div className="grid gap-2">
        {scorers.map((s, i) => (
          <input
            key={i}
            type="text"
            value={s}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={
              i < 2
                ? `${homeName} · ${locale === "fr" ? "ex. Mbappé" : "e.g. Mbappé"}`
                : `${awayName} · ${locale === "fr" ? "ex. Pulisic" : "e.g. Pulisic"}`
            }
            maxLength={80}
            className="w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-500/50"
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-text-tertiary">
        {locale === "fr"
          ? `+${POINTS_SCHEME.anytime_scorer_each} pts par joueur trouvé · saisis juste le nom de famille`
          : `+${POINTS_SCHEME.anytime_scorer_each} pts per correct scorer · last name is enough`}
      </p>
    </div>
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
            "flex size-10 items-center justify-center rounded-full text-2xl",
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
