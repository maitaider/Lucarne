import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Tone = "primary" | "gold" | "violet" | "steel" | "emerald";

const sizeClass: Record<Size, string> = {
  xs: "size-5 text-[8px]",
  sm: "size-7 text-[9px]",
  md: "size-9 text-[10px]",
  lg: "size-11 text-xs",
  xl: "size-14 text-sm",
  "2xl": "size-20 text-base",
};

const palettes: Record<Tone, { accent: string; base: string; glow: string }> = {
  primary: { accent: "#22d982", base: "#12261d", glow: "rgba(34,217,130,0.28)" },
  gold: { accent: "#f5c447", base: "#302711", glow: "rgba(245,196,71,0.28)" },
  violet: { accent: "#7c5cff", base: "#211a38", glow: "rgba(124,92,255,0.28)" },
  steel: { accent: "#cbd5e1", base: "#1b2530", glow: "rgba(203,213,225,0.18)" },
  emerald: { accent: "#5ee6b0", base: "#132d27", glow: "rgba(94,230,176,0.24)" },
};

const toneOrder: Tone[] = ["primary", "gold", "violet", "steel", "emerald"];

export function TeamEmblem({
  code,
  name,
  size = "md",
  tone,
  className,
}: {
  code?: string | null;
  name?: string | null;
  size?: Size;
  tone?: Tone;
  className?: string;
}) {
  const label = emblemLabel(code, name);
  const selected = tone ?? toneOrder[hashCode(label) % toneOrder.length];
  const palette = palettes[selected];
  const style = {
    "--team-accent": palette.accent,
    "--team-base": palette.base,
    "--team-glow": palette.glow,
  } as CSSProperties;

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.16] bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.22),transparent_30%),linear-gradient(145deg,var(--team-base),rgba(4,6,8,0.95))] font-mono font-black uppercase leading-none text-text-primary shadow-[0_0_22px_var(--team-glow),inset_0_1px_0_rgba(255,255,255,0.14)]",
        sizeClass[size],
        className,
      )}
      style={style}
    >
      <span className="absolute inset-[14%] rounded-full border border-[color:var(--team-accent)]/45" />
      <span className="absolute left-1/2 top-[18%] h-[18%] w-[52%] -translate-x-1/2 rounded-full bg-[color:var(--team-accent)]/75 blur-[1px]" />
      <span className="absolute bottom-[15%] h-px w-[54%] bg-[color:var(--team-accent)]/75" />
      <span className="relative z-10 drop-shadow-[0_1px_0_rgba(0,0,0,0.65)]">
        {label}
      </span>
    </span>
  );
}

function emblemLabel(code?: string | null, name?: string | null): string {
  const source = (code || name || "TBD").trim();
  const cleaned = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return "TBD";
  if (cleaned.length <= 3) return cleaned;
  if (code) return cleaned.slice(0, 3);
  return cleaned.slice(0, 2);
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
