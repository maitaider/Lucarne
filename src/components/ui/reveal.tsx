"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades + rises its children in when they scroll into view (once). Use to
 * animate long/marketing pages section-by-section. Honors
 * prefers-reduced-motion (shows instantly). Pure CSS transition under the
 * hood — no animation-library vendor chunk.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  /** translate distance in px before reveal */
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "opacity-0",
        className,
      )}
      style={{
        transitionDelay: shown ? `${delayMs}ms` : "0ms",
        transform: shown ? undefined : `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
}
