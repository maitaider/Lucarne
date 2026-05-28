import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Pill badge / chip / kicker. Replaces the dozens of inline
 * `rounded-full bg-…/15 px-… text-[10px] uppercase` snippets.
 *
 * Plain class maps (no class-variance-authority) to keep the kit free of
 * an extra vendor chunk Next's dev server is flaky about emitting.
 */
type Tone =
  | "neutral"
  | "primary"
  | "gold"
  | "violet"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider leading-none";

const TONE: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-text-secondary",
  primary: "bg-primary-500/15 text-primary-300",
  gold: "bg-gold-500/15 text-gold-300",
  violet: "bg-violet-500/15 text-violet-300",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
  outline: "border border-border-strong/60 text-text-secondary",
};

const SIZE: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[9px]",
  md: "px-2 py-1 text-[10px]",
  lg: "px-2.5 py-1 text-[11px]",
};

type BadgeProps = {
  tone?: Tone;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  /** Pulsing live dot (use with tone="violet" or "error"). */
  pulse?: boolean;
};

export function Badge({
  tone = "neutral",
  size = "md",
  children,
  className,
  icon: Icon,
  pulse,
}: BadgeProps) {
  return (
    <span className={cn(BASE, TONE[tone], SIZE[size], className)}>
      {pulse && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {Icon && <Icon className="size-3" strokeWidth={2.2} />}
      {children}
    </span>
  );
}
