"use client";

import { useCallback } from "react";
import confetti from "canvas-confetti";

/**
 * Trigger confetti bursts tuned for Lucarne's color palette.
 *
 *   const fire = useConfetti();
 *   fire("celebrate");  // generous double burst, for wins / big moments
 *   fire("place");      // discreet single burst, for placing a bet
 */
export function useConfetti() {
  return useCallback((preset: "celebrate" | "place" = "place") => {
    if (typeof window === "undefined") return;

    const lucarneColors = [
      "#22d982", // primary
      "#3fe599", // primary lighter
      "#f5c447", // gold
      "#ffd66b", // gold lighter
      "#7c5cff", // violet
      "#9a82ff", // violet lighter
    ];

    if (preset === "place") {
      void confetti({
        particleCount: 80,
        spread: 60,
        startVelocity: 35,
        origin: { y: 0.7 },
        colors: lucarneColors,
        scalar: 0.85,
        ticks: 180,
      });
      return;
    }

    // celebrate: two side-bursts
    const opts = {
      particleCount: 120,
      spread: 70,
      startVelocity: 45,
      colors: lucarneColors,
      ticks: 240,
    } as const;
    void confetti({ ...opts, origin: { x: 0.15, y: 0.55 }, angle: 60 });
    void confetti({ ...opts, origin: { x: 0.85, y: 0.55 }, angle: 120 });
  }, []);
}
