"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated number that counts up to `value` on mount / when it changes.
 * Dependency-free (rAF). Honors prefers-reduced-motion by showing the
 * value instantly.
 */
export function CountUp({
  value,
  durationMs = 850,
  locale,
}: {
  value: number;
  durationMs?: number;
  /** BCP-47 locale tag for number formatting (e.g. "fr-FR"). A plain
   *  string so it can cross the server→client boundary. */
  locale?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const n = Math.round(display);
  return <>{n.toLocaleString(locale)}</>;
}
