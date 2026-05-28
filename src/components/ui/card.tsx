import { Link } from "@/i18n/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The standard content surface. SOLID background + crisp 1px border +
 * elevation shadow — readable hierarchy without stacking backdrop-blur
 * on every panel (blur is reserved for true overlays).
 *
 * Use this instead of ad-hoc `rounded-[Npx] border bg-surface-1/[0.x]
 * backdrop-blur-xl` divs. Renders a Link when `href` is set.
 */
export const cardVariants = cva(
  "rounded-md border bg-surface-1 shadow-card",
  {
    variants: {
      accent: {
        neutral: "border-border-subtle",
        primary: "border-primary-500/25",
        gold: "border-gold-500/30 bg-gradient-to-br from-gold-500/[0.08] via-surface-1 to-surface-1",
        violet:
          "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-surface-1 to-surface-1",
      },
      interactive: {
        true: "transition hover:border-primary-500/45 hover:shadow-raised",
        false: "",
      },
      padded: {
        none: "",
        sm: "p-3",
        md: "p-4 sm:p-5",
        lg: "p-5 sm:p-6",
      },
    },
    defaultVariants: { accent: "neutral", interactive: false, padded: "none" },
  },
);

type CardProps = VariantProps<typeof cardVariants> & {
  children: React.ReactNode;
  className?: string;
  href?: string;
};

export function Card({
  accent,
  interactive,
  padded,
  children,
  className,
  href,
}: CardProps) {
  const classes = cn(
    cardVariants({
      accent,
      interactive: interactive ?? (href ? true : false),
      padded,
    }),
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
