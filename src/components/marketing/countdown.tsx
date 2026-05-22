"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function computeParts(targetMs: number): Parts {
  const now = Date.now();
  const diff = Math.max(targetMs - now, 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const locale = useLocale();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => setParts(computeParts(target));
    const initialFrame = window.requestAnimationFrame(tick);
    const id = window.setInterval(tick, 1000);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(id);
    };
  }, [target]);

  const labels =
    locale === "fr"
      ? { days: "jours", hours: "h", minutes: "min", seconds: "s", title: "Coup d'envoi dans" }
      : { days: "days", hours: "h", minutes: "min", seconds: "s", title: "Kick-off in" };

  // SSR placeholder (avoid hydration mismatch by rendering zeros first)
  const display = parts ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className="inline-flex max-w-full flex-col gap-2 rounded-[8px] border border-white/[0.14] bg-abyss/50 px-5 py-4 backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {labels.title}
      </div>
      <div
        className="flex items-baseline gap-2 font-mono tabular-nums sm:gap-4"
        suppressHydrationWarning
      >
        <Unit value={display.days} label={labels.days} accent />
        <Sep />
        <Unit value={display.hours} label={labels.hours} />
        <Sep />
        <Unit value={display.minutes} label={labels.minutes} />
        <Sep />
        <Unit value={display.seconds} label={labels.seconds} muted />
      </div>
    </div>
  );
}

function Unit({
  value,
  label,
  accent,
  muted,
}: {
  value: number;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col items-start leading-none">
      <span
        className={`font-display text-3xl font-bold sm:text-4xl ${accent ? "text-primary-400" : muted ? "text-text-secondary" : "text-text-primary"}`}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span className="font-display text-2xl font-bold text-text-tertiary sm:text-3xl">
      :
    </span>
  );
}
