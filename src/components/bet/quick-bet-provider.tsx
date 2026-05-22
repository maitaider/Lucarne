"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { Loader2, X, Zap, Coins, Trophy } from "lucide-react";
import { placeBet } from "@/lib/bets/place-bet";
import { estimatePayout } from "@/lib/bets/types";
import { Flag } from "@/components/team/flag";
import { useToast } from "@/components/ui/toast-provider";
import { useConfetti } from "@/lib/hooks/use-confetti";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

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
  open: (match: QuickBetMatch) => void;
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

export function QuickBetProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [match, setMatch] = useState<QuickBetMatch | null>(null);

  const ctx = useMemo<QuickBetCtx>(
    () => ({
      open: (m) => setMatch(m),
      close: () => setMatch(null),
    }),
    [],
  );

  return (
    <QuickBetContext.Provider value={ctx}>
      {children}
      {match && (
        <QuickBetSheet
          match={match}
          locale={locale}
          onClose={() => setMatch(null)}
        />
      )}
    </QuickBetContext.Provider>
  );
}

function QuickBetSheet({
  match,
  locale,
  onClose,
}: {
  match: QuickBetMatch;
  locale: Locale;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const fireConfetti = useConfetti();

  const [pick, setPick] = useState<"home" | "draw" | "away" | null>(null);
  const [stake, setStake] = useState(50);
  const [isPending, setIsPending] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ESC to close
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

  async function handleSubmit() {
    if (!pick || isPending) return;
    setIsPending(true);
    const res = await placeBet({
      match_id: match.id,
      league_id: null,
      bet: {
        bet_type: "match_winner",
        match_id: match.id,
        payload: { winner: pick },
      },
      stake_cents: Math.round(stake * 100),
      client_request_id: crypto.randomUUID(),
    });
    setIsPending(false);

    if (res.ok) {
      fireConfetti("place");
      toast.success(
        locale === "fr"
          ? "Pronostic placé ! En attente de validation admin."
          : "Bet placed! Pending admin validation.",
      );
      handleClose();
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

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
  const potentialPayout = estimatePayout("match_winner", stake);

  const kickoff = new Date(match.kickoff_at);
  const dateStr = kickoff.toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { weekday: "short", day: "numeric", month: "short" },
  );
  const timeStr = kickoff.toLocaleTimeString(
    locale === "fr" ? "fr-FR" : "en-US",
    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" },
  );

  const isLockedOut =
    match.status === "live" ||
    match.status === "finished" ||
    kickoff.getTime() - Date.now() < 60_000;

  // Stake quick-pick presets
  const presets = [25, 50, 100, 250];

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        onClick={handleClose}
        aria-label={locale === "fr" ? "Fermer" : "Close"}
        className={cn(
          "absolute inset-0 bg-abyss/80 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sheet — bottom on mobile, centered on desktop */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg transition-transform duration-200 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          visible
            ? "translate-y-0 sm:translate-y-[-50%]"
            : "translate-y-full sm:translate-y-[calc(-50%+24px)] sm:opacity-0",
        )}
      >
        <div className="relative overflow-hidden rounded-t-[16px] border border-white/[0.12] bg-abyss/95 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:rounded-[12px]">
          {/* Gradient header */}
          <div className="relative overflow-hidden border-b border-white/[0.08] bg-gradient-to-br from-primary-500/[0.12] via-violet-500/[0.06] to-transparent px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-400 ring-1 ring-primary-500/30">
                  <Zap className="size-3" strokeWidth={2.5} />
                  {locale === "fr" ? "Pari rapide" : "Quick bet"}
                </div>
                <h2 className="font-display text-lg font-semibold leading-tight text-text-primary">
                  {homeName} <span className="text-text-tertiary">vs</span>{" "}
                  {awayName}
                </h2>
                <p className="mt-1 text-xs text-text-tertiary">
                  {dateStr} · {timeStr}
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
                  ? "Les paris sont fermés pour ce match (coup d'envoi imminent ou passé)."
                  : "Betting is closed for this match (kickoff imminent or past)."}
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* 1-N-2 picker */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  {locale === "fr" ? "Qui va gagner ?" : "Who will win?"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <WinnerButton
                    active={pick === "home"}
                    onClick={() => setPick("home")}
                    label={homeName}
                    iso={match.home_team?.iso_code ?? null}
                    badge="1"
                  />
                  <WinnerButton
                    active={pick === "draw"}
                    onClick={() => setPick("draw")}
                    label={locale === "fr" ? "Match nul" : "Draw"}
                    iso={null}
                    badge="N"
                    isDraw
                  />
                  <WinnerButton
                    active={pick === "away"}
                    onClick={() => setPick("away")}
                    label={awayName}
                    iso={match.away_team?.iso_code ?? null}
                    badge="2"
                  />
                </div>
              </div>

              {/* Stake picker */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                    {locale === "fr" ? "Ta mise" : "Your stake"}
                  </p>
                  <p className="font-display text-2xl font-bold tabular-nums text-text-primary">
                    {stake}
                    <span className="ml-1 text-xs font-normal text-text-tertiary">
                      {locale === "fr" ? "jetons" : "tokens"}
                    </span>
                  </p>
                </div>
                <input
                  type="range"
                  min={10}
                  max={1000}
                  step={5}
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setStake(p)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs font-semibold transition",
                        stake === p
                          ? "border-primary-500/45 bg-primary-500/15 text-primary-300"
                          : "border-white/[0.08] bg-white/[0.04] text-text-secondary hover:border-white/[0.16] hover:text-text-primary",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payout preview */}
              <div className="flex items-center justify-between rounded-[8px] border border-primary-500/[0.18] bg-primary-500/[0.07] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Trophy
                    className="size-4 text-primary-400"
                    strokeWidth={2}
                  />
                  <span className="text-sm font-medium text-text-secondary">
                    {locale === "fr" ? "Gain potentiel" : "Potential win"}
                  </span>
                </div>
                <span className="font-display text-xl font-bold tabular-nums text-primary-400">
                  +{potentialPayout.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-text-secondary">
                    {locale === "fr" ? "jetons" : "tokens"}
                  </span>
                </span>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!pick || isPending}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-3.5 text-sm font-semibold transition",
                  pick && !isPending
                    ? "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400"
                    : "bg-white/[0.06] text-text-tertiary",
                )}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Coins className="size-4" strokeWidth={2} />
                )}
                {pick
                  ? locale === "fr"
                    ? `Valider ${stake} jetons`
                    : `Confirm ${stake} tokens`
                  : locale === "fr"
                    ? "Choisis un pronostic"
                    : "Pick a winner"}
              </button>

              <p className="text-center text-[10px] text-text-tertiary">
                {locale === "fr"
                  ? "Validation admin requise · Vous verrez vos paris d'amis au coup d'envoi"
                  : "Admin validation required · Friends' bets reveal at kickoff"}
              </p>
            </div>
          )}
        </div>
      </div>
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
          active
            ? "bg-primary-500 text-abyss"
            : "bg-white/10 text-text-tertiary",
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
