"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

const STORAGE_KEY = "lucarne_onboarding_v1";

type Step = {
  icon: LucideIcon;
  tone: "primary" | "gold" | "violet";
  title: { fr: string; en: string };
  body: { fr: string; en: string };
  illustration?: React.ReactNode;
};

const STEPS: Step[] = [
  {
    icon: Trophy,
    tone: "gold",
    title: {
      fr: "Bienvenue sur Lucarne 🏆",
      en: "Welcome to Lucarne 🏆",
    },
    body: {
      fr: "Lucarne, c'est ton terrain de pronostics privé pour la Coupe du Monde 2026. 48 équipes, 104 matchs, des ligues entre amis. Gratuit, sans mise — tu joues pour les points.",
      en: "Lucarne is your private prediction arena for the 2026 World Cup. 48 teams, 104 matches, leagues with friends. Free, no stake — you play for points.",
    },
    illustration: <BalanceIllustration />,
  },
  {
    icon: CalendarDays,
    tone: "primary",
    title: {
      fr: "Trouve ton match",
      en: "Find a match",
    },
    body: {
      fr: "Ouvre l'onglet Matchs. Choisis entre la vue Groupes (tableaux W/D/L) et la vue Calendrier (par date). Repère une affiche qui te branche.",
      en: "Open the Matches tab. Switch between Group view (W/D/L tables) and Calendar (by date). Spot a fixture you like.",
    },
    illustration: <MatchesIllustration />,
  },
  {
    icon: Zap,
    tone: "violet",
    title: {
      fr: "Pronostique en 1 clic",
      en: "Quick-bet in 1 tap",
    },
    body: {
      fr: "Va dans l'onglet Pronostics. Mets le score de chaque match et bâtis ta phase finale (elle aussi notée) — c'est gratuit et modifiable jusqu'à 1 h avant le coup d'envoi du 1ᵉʳ match.",
      en: "Open the Predictions tab. Set each match score and build your knockout bracket (scored too) — free and editable until 1 h before the first match kicks off.",
    },
    illustration: <QuickBetIllustration />,
  },
  {
    icon: Users,
    tone: "primary",
    title: {
      fr: "Joue avec tes potes",
      en: "Play with your crew",
    },
    body: {
      fr: "Crée une ligue privée, partage le code d'invitation, et défie-les sur l'ensemble du tournoi. Personne ne voit tes paris avant le coup d'envoi.",
      en: "Create a private league, share the invite code, and challenge them across the tournament. Nobody sees your picks before kickoff.",
    },
    illustration: <LeagueIllustration />,
  },
  {
    icon: ShieldCheck,
    tone: "gold",
    title: {
      fr: "Marque des points",
      en: "Score points",
    },
    body: {
      fr: "Au coup de sifflet final, tes pronos se règlent automatiquement : tu marques des points et le classement se met à jour. Le top 3 final se partage la cagnotte.",
      en: "At the final whistle, your predictions settle automatically: you score points and the leaderboard updates. The top 3 split the pot at the end.",
    },
    illustration: <WinIllustration />,
  },
];

export function OnboardingTour({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Show only if user hasn't seen it yet
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable, skip
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        type="button"
        onClick={close}
        aria-label={locale === "fr" ? "Fermer" : "Close"}
        className="absolute inset-0 bg-abyss/85 backdrop-blur-md"
      />

      {/* Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-white/[0.1] bg-abyss/95 shadow-2xl shadow-black/70 backdrop-blur-2xl">
        <button
          type="button"
          onClick={close}
          aria-label={locale === "fr" ? "Passer" : "Skip"}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-text-tertiary transition hover:bg-white/[0.08] hover:text-text-primary"
        >
          <X className="size-4" strokeWidth={2} />
        </button>

        {/* Illustration */}
        <div
          className={cn(
            "flex h-44 items-center justify-center border-b border-white/[0.06]",
            current.tone === "primary" &&
              "bg-gradient-to-br from-primary-500/[0.15] via-primary-500/[0.05] to-transparent",
            current.tone === "gold" &&
              "bg-gradient-to-br from-gold-500/[0.15] via-gold-500/[0.05] to-transparent",
            current.tone === "violet" &&
              "bg-gradient-to-br from-violet-500/[0.15] via-violet-500/[0.05] to-transparent",
          )}
        >
          {current.illustration ?? (
            <Icon
              className={cn(
                "size-20",
                current.tone === "primary" && "text-primary-400",
                current.tone === "gold" && "text-gold-400",
                current.tone === "violet" && "text-violet-400",
              )}
              strokeWidth={1.4}
            />
          )}
        </div>

        <div className="p-6">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            <Icon className="size-3" strokeWidth={2} />
            {locale === "fr"
              ? `Étape ${step + 1}/${STEPS.length}`
              : `Step ${step + 1}/${STEPS.length}`}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary">
            {current.title[locale]}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {current.body[locale]}
          </p>

          {/* Progress dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-6 bg-primary-500"
                    : "w-1.5 bg-white/[0.15] hover:bg-white/[0.3]",
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold transition",
                step === 0
                  ? "text-text-tertiary opacity-40"
                  : "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
              )}
            >
              <ChevronLeft className="size-3.5" strokeWidth={2.5} />
              {locale === "fr" ? "Précédent" : "Back"}
            </button>

            {isLast ? (
              <Link
                href="/matches"
                onClick={close}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
              >
                <Sparkles className="size-4" strokeWidth={2.5} />
                {locale === "fr" ? "Démarrer" : "Get started"}
                <ArrowRight className="size-3.5" strokeWidth={2.5} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-bold text-abyss shadow-glow-primary transition hover:bg-primary-400"
              >
                {locale === "fr" ? "Suivant" : "Next"}
                <ChevronRight className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline illustrations — vector compositions, no external assets            */
/* -------------------------------------------------------------------------- */

function BalanceIllustration() {
  return (
    <div className="relative">
      <div className="relative flex size-32 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.06] shadow-glow-gold">
        <Trophy className="size-16 text-gold-400" strokeWidth={1.4} />
        <span className="absolute -bottom-3 -right-3 inline-flex items-center gap-1 rounded-full bg-primary-500 px-2.5 py-1 font-mono text-xs font-bold text-abyss shadow-glow-primary">
          1 000
        </span>
      </div>
    </div>
  );
}

function MatchesIllustration() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-8 w-14 rounded-md border",
            i % 3 === 0
              ? "border-primary-500/40 bg-primary-500/[0.1]"
              : i % 3 === 1
                ? "border-violet-500/40 bg-violet-500/[0.1]"
                : "border-white/[0.1] bg-white/[0.03]",
          )}
        />
      ))}
    </div>
  );
}

function QuickBetIllustration() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-14 items-center justify-center rounded-full border-2 border-primary-500/50 bg-primary-500/15 shadow-glow-primary">
        <span className="font-display text-xl font-bold text-primary-300">1</span>
      </div>
      <div className="flex size-12 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]">
        <span className="font-display text-base font-bold text-text-secondary">X</span>
      </div>
      <div className="flex size-12 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]">
        <span className="font-display text-base font-bold text-text-secondary">2</span>
      </div>
      <div className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary-500 px-3 py-1.5 text-xs font-bold text-abyss shadow-glow-primary">
        <Zap className="size-3" strokeWidth={2.5} />
        50
      </div>
    </div>
  );
}

function LeagueIllustration() {
  return (
    <div className="flex items-center -space-x-3">
      {[
        "from-primary-500/30 to-primary-500/10",
        "from-gold-500/30 to-gold-500/10",
        "from-violet-500/30 to-violet-500/10",
        "from-emerald-500/30 to-emerald-500/10",
      ].map((grad, i) => (
        <div
          key={i}
          className={`flex size-14 items-center justify-center rounded-full bg-gradient-to-br ${grad} font-mono text-xs font-bold uppercase text-text-primary ring-2 ring-abyss`}
        >
          {String.fromCharCode(65 + i)}
          {String.fromCharCode(76 + i)}
        </div>
      ))}
      <div className="flex size-14 items-center justify-center rounded-full bg-primary-500/20 text-primary-300 ring-2 ring-abyss">
        <span className="font-display text-sm font-bold">+5</span>
      </div>
    </div>
  );
}

function WinIllustration() {
  return (
    <div className="relative">
      <Trophy className="size-20 text-gold-400 drop-shadow-[0_0_24px_rgba(245,196,71,0.5)]" strokeWidth={1.3} />
      <div className="absolute -right-6 -top-2 rounded-full bg-primary-500 px-2 py-1 font-mono text-xs font-bold text-abyss shadow-glow-primary">
        +400
      </div>
      <div className="absolute -bottom-3 -left-4 rounded-full bg-gold-500 px-2 py-1 font-mono text-xs font-bold text-abyss shadow-glow-gold">
        +12 pts
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  "Replay tour" button — drop this in the header / settings                 */
/* -------------------------------------------------------------------------- */

export function ReplayTourButton({ locale }: { locale: Locale }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        window.location.reload();
      }}
      aria-label={locale === "fr" ? "Revoir le tour" : "Replay tour"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-text-secondary transition hover:border-primary-500/40 hover:bg-primary-500/[0.1] hover:text-primary-300"
      title={locale === "fr" ? "Aide / revoir le tour" : "Help / replay tour"}
    >
      <HelpCircle className="size-4" strokeWidth={2} />
    </button>
  );
}
