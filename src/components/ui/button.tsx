import { Link } from "@/i18n/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * The one Button for the whole app. Variants are the only sanctioned
 * action styles — stop hand-rolling `rounded-[Npx] border px-… py-…`.
 *
 * Renders an <a> (via the i18n Link) when `href` is set, otherwise a
 * native <button>. No hooks, so it's safe in both server and client trees.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm font-semibold leading-none whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400 active:bg-primary-600",
        gold: "bg-gold-500 text-abyss shadow-glow-gold hover:bg-gold-400 active:bg-gold-600",
        secondary:
          "border border-border-strong/70 bg-white/[0.05] text-text-primary hover:border-primary-500/45 hover:bg-white/[0.08]",
        ghost:
          "text-text-secondary hover:bg-white/[0.06] hover:text-text-primary",
        danger:
          "border border-error/40 bg-error/[0.1] text-error hover:bg-error/[0.18]",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

type ButtonProps = VariantProps<typeof buttonVariants> & {
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

const ICON_SIZE = { sm: "size-3.5", md: "size-4", lg: "size-5" } as const;

export function Button({
  variant,
  size,
  block,
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
  const iconClass = ICON_SIZE[size ?? "md"];
  const classes = cn(buttonVariants({ variant, size, block }), className);
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
