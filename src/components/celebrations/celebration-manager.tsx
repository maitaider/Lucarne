"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { Confetti } from "./confetti";
import { claimCelebration } from "@/lib/celebrations/actions";
import type { Locale } from "@/i18n/routing";

// One claim per tab-session (sessionStorage). Combined with the DB `celebrated_at`
// flag (set inside the RPC), a celebration never replays on refresh or in a new
// session — and at most one fires per session (sobriety).
const SESSION_KEY = "lucarne:celebrated";

/**
 * Mounted once in the app shell. On first load of a session it claims the
 * player's best un-celebrated win and fêtes it: a gold toast, plus light
 * confetti for an exact score. Silent when there's nothing to celebrate.
 */
export function CelebrationManager({ locale }: { locale: Locale }) {
  const { celebrate } = useToast();
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    let cancelled = false;
    void (async () => {
      const c = await claimCelebration();
      if (!c || cancelled) return;
      const fr = locale === "fr";
      const match = `${fr ? c.homeFr : c.homeEn}–${fr ? c.awayFr : c.awayEn}`;
      if (c.isExact) {
        setConfetti(true);
        celebrate(
          fr
            ? `🎯 Score exact ! +${c.points} pts sur ${match}`
            : `🎯 Exact score! +${c.points} pts on ${match}`,
        );
      } else {
        celebrate(
          fr
            ? `+${c.points} pts sur ${match} !`
            : `+${c.points} pts on ${match}!`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, celebrate]);

  return confetti ? <Confetti onDone={() => setConfetti(false)} /> : null;
}
