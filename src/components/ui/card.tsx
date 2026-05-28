import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The standard content surface. SOLID background + crisp 1px border +
 * elevation shadow — readable hierarchy without stacking backdrop-blur
 * on every panel (blur is reserved for true overlays).
 *
 * Use this instead of ad-hoc `rounded-[Npx] border bg-surface-1/[0.x]
 * backdrop-blur-xl` divs. Renders a Link when `href` is set.
 *
 * Plain class maps (no class-variance-authority) to keep the kit free of
 * an extra vendor chunk Next's dev server is flaky about emitting.
 */
type Accent = "neutral" | "primary" | "gold" | "violet";
type Padded = "none" | "sm" | "md" | "lg";

const BASE = "rounded-md border bg-surface-1 shadow-card";

const ACCENT: Record<Accent, string> = {
  neutral: "border-border-subtle",
  primary: "border-primary-500/25",
  gold: "border-gold-500/30 bg-gradient-to-br from-gold-500/[0.08] via-surface-1 to-surface-1",
  violet:
    "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-surface-1 to-surface-1",
};

const PADDED: Record<Padded, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

type CardProps = {
  accent?: Accent;
  interactive?: boolean;
  padded?: Padded;
  children: React.ReactNode;
  className?: string;
  href?: string;
};

export function Card({
  accent = "neutral",
  interactive,
  padded = "none",
  children,
  className,
  href,
}: CardProps) {
  const isInteractive = interactive ?? Boolean(href);
  const classes = cn(
    BASE,
    ACCENT[accent],
    isInteractive &&
      "transition duration-200 hover:-translate-y-0.5 hover:border-primary-500/45 hover:shadow-raised active:translate-y-0 active:scale-[0.995]",
    PADDED[padded],
    href && "group block",
    className,
  );
  if (typeof href === "string") {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <div className={classes}>{children}</div>;
}
