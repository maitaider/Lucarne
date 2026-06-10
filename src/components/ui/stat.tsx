import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Accent = "primary" | "gold" | "violet" | "neutral";

const ACCENT: Record<Accent, { chip: string; icon: string }> = {
  primary: { chip: "bg-primary-500/12 ring-primary-500/30", icon: "text-primary-400" },
  gold: { chip: "bg-gold-500/12 ring-gold-500/30", icon: "text-gold-400" },
  violet: { chip: "bg-violet-500/12 ring-violet-500/30", icon: "text-violet-400" },
  neutral: { chip: "bg-white/[0.06] ring-white/[0.12]", icon: "text-text-secondary" },
};

/**
 * Compact KPI tile (icon + label + value + detail). Replaces the
 * dashboard's bespoke CommandMetric. Becomes a link when `href` is set.
 */
export function Stat({
  icon: Icon,
  label,
  value,
  detail,
  accent = "primary",
  href,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: string;
  accent?: Accent;
  href?: string;
  className?: string;
}) {
  const tone = ACCENT[accent];
  const inner = (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-1/[0.45] p-2.5 shadow-card backdrop-blur-md transition",
        href && "group-hover:border-white/[0.18] group-hover:bg-surface-2",
        className,
      )}
    >
      <span className={cn("rounded-sm p-1.5 ring-1", tone.chip)}>
        <Icon className={cn("size-3.5", tone.icon)} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </div>
        <div className="font-display text-base font-bold tabular-nums leading-tight text-text-primary sm:text-lg">
          {value}
        </div>
        {detail && (
          <div className="truncate text-[10px] text-text-tertiary">{detail}</div>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
