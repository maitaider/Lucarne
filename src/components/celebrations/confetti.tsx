"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight homemade confetti — a single canvas burst, no dependency. Falls,
 * fades, then self-clears (~2.6s). Skipped entirely under prefers-reduced-motion
 * (calls onDone immediately). Colors stay within the palette (gold / primary /
 * violet / white). Reserved for the special "exact score" moment.
 */
export function Confetti({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      onDone?.();
      return;
    }
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (canvas.width = window.innerWidth * dpr);
    const H = (canvas.height = window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const COLORS = ["#f5c451", "#e0a92e", "#22d982", "#7c5cff", "#ffffff"];
    const N = 120;
    type P = {
      x: number; y: number; vx: number; vy: number;
      rot: number; vr: number; w: number; h: number; c: string;
    };
    const parts: P[] = Array.from({ length: N }, () => ({
      x: W * (0.15 + Math.random() * 0.7),
      y: -20 * dpr - Math.random() * H * 0.25,
      vx: (Math.random() - 0.5) * 6 * dpr,
      vy: (2 + Math.random() * 4) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: (5 + Math.random() * 5) * dpr,
      h: (8 + Math.random() * 6) * dpr,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const start = performance.now();
    const DURATION = 2600;
    let raf = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * dpr;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (elapsed < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
        onDone?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[300]"
    />
  );
}
