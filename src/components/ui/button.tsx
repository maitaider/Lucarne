import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * The one Button for the whole app. Variants are the only sanctioned
 * action styles — stop hand-rolling `rounded-[Npx] border px-… py-…`.
 *
 * Renders an <a> (via the i18n Link) when `href` is set, otherwise a
 * native <button>. No hooks, so it's safe in both server and client trees.
 *
 * Note: variants are plain class maps (not class-variance-authority) on
 * purpose — it keeps the kit free of an extra vendor chunk that Next's
 * dev server is flaky about emitting.
 */
type Variant = "primary" | "gold" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold leading-none whitespace-nowrap transition duration-150 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400 active:bg-primary-600",
  gold: "bg-gold-500 text-abyss shadow-glow-gold hover:bg-gold-400 active:bg-gold-600",
  secondary:
    "border border-border-strong/70 bg-white/[0.05] text-text-primary hover:border-primary-500/45 hover:bg-white/[0.08]",
  ghost: "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
  danger: "border border-error/40 bg-error/[0.1] text-error hover:bg-error/[0.18]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

const ICON_SIZE: Record<Size, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/** Compose button classes for cases where you need them on a non-Button. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
}: { variant?: Variant; size?: Size; block?: boolean } = {}): string {
  return cn(BASE, VARIANT[variant], SIZE[size], block && "w-full");
}

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Leading icon. */
  icon?: LucideIcon;
  /** Trailing icon (e.g. ArrowRight). */
  iconRight?: LucideIcon;
  /** When set, renders a localized Link instead of a <button>. */
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
  target?: string;
  prefetch?: boolean;
  "aria-label"?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  children,
  className,
  icon: Icon,
  iconRight: IconRight,
  href,
  type = "button",
  onClick,
  disabled,
  title,
  target,
  prefetch,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const iconClass = ICON_SIZE[size];
  const classes = cn(buttonClasses({ variant, size, block }), className);
  const content = (
    <>
      {Icon && <Icon className={cn(iconClass, "shrink-0")} strokeWidth={2} />}
      {children}
      {IconRight && (
        <IconRight className={cn(iconClass, "shrink-0")} strokeWidth={2} />
      )}
    </>
  );

  if (typeof href === "string") {
    return (
      <Link
        href={href}
        target={target}
        prefetch={prefetch}
        aria-label={ariaLabel}
        title={title}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={classes}
    >
      {content}
    </button>
  );
}
