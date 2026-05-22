import { Flag } from "./flag";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const flagSize: Record<Size, "xs" | "sm" | "md" | "lg" | "xl" | "2xl"> = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

const nameClass: Record<Size, string> = {
  xs: "text-[10px] font-medium",
  sm: "text-xs font-medium",
  md: "text-sm font-semibold",
  lg: "text-base font-semibold tracking-tight",
  xl: "font-display text-xl font-semibold tracking-tight",
};

export type TeamSummary = {
  fifa_code?: string | null;
  iso_code?: string | null;
  name_fr: string;
  name_en: string;
  flag_emoji?: string | null;
};

export function TeamCrest({
  team,
  size = "md",
  locale,
  showCode = false,
  fallbackText,
  className,
  align = "left",
}: {
  team: TeamSummary | null;
  size?: Size;
  locale: Locale;
  showCode?: boolean;
  fallbackText?: string | null;
  className?: string;
  align?: "left" | "right";
}) {
  const reversed = align === "right";
  const name = team ? (locale === "fr" ? team.name_fr : team.name_en) : fallbackText ?? "—";

  if (!team) {
    return (
      <div
        className={cn(
          "flex items-center gap-2",
          reversed && "flex-row-reverse",
          className,
        )}
      >
        <span
          className="inline-block rounded-sm bg-surface-3"
          style={{ width: 24, height: 18 }}
        />
        <span className={cn(nameClass[size], "text-text-tertiary")}>
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        reversed && "flex-row-reverse",
        className,
      )}
    >
      <Flag
        isoCode={team.iso_code ?? null}
        emoji={team.flag_emoji ?? null}
        size={flagSize[size]}
      />
      <div className={cn("min-w-0", reversed && "text-right")}>
        <div className={cn(nameClass[size], "truncate text-text-primary")}>
          {name}
        </div>
        {showCode && team.fifa_code && (
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            {team.fifa_code}
          </div>
        )}
      </div>
    </div>
  );
}
