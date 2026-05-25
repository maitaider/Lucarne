import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Accent = "gold" | "primary" | "violet";

const ACCENT_CLASSES: Record<Accent, { kicker: string; ring: string }> = {
  gold: {
    kicker: "border-gold-500/30 bg-gold-500/[0.1] text-gold-300",
    ring: "shadow-glow-gold",
  },
  primary: {
    kicker: "border-primary-500/35 bg-primary-500/[0.1] text-primary-300",
    ring: "shadow-glow-primary",
  },
  violet: {
    kicker: "border-violet-500/35 bg-violet-500/[0.1] text-violet-300",
    ring: "shadow-glow-violet",
  },
};

/**
 * Standard hero block used at the top of every connected page.
 *
 * Layout:
 *   ┌─ background (stadium photo or asset svg) ────────────────┐
 *   │  [Kicker chip · accent]                                  │
 *   │  H1 title                                                │
 *   │  Description (≤2 lines)                                  │
 *   │  [primary action]  [secondary action]                    │
 *   │                                            (visual SVG)  │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The visual is optional. When present it lives on the right on desktop
 * and below the text on mobile, sized so it never crowds the actions.
 *
 * Stats are an optional row of compact KPI chips rendered below the
 * actions (think "12/12 groups · 18 picks · rank #3"). Stats live in the
 * hero rather than a separate strip so the user gets context immediately.
 */
export function PageHero({
  kicker,
  kickerIcon: KickerIcon,
  accent = "primary",
  title,
  description,
  actions,
  stats,
  visual,
  background = "default",
  className,
}: {
  kicker: string;
  kickerIcon?: LucideIcon;
  accent?: Accent;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Compact KPI chips rendered below the actions. */
  stats?: React.ReactNode;
  /**
   * Optional visual asset. Pass `{ src, alt, priority? }` to render an
   * `<Image>` on the right. Pass `false` (or omit) for text-only hero.
   */
  visual?: { src: string; alt: string; priority?: boolean } | false;
  /**
   * Background treatment.
   *  - "default": dark glass over the stadium photo
   *  - "subtle":  no photo, just the abyss surface (use when the visual
   *    asset is the focal point and the photo would compete)
   *  - "none":    fully transparent (use inside a parent that already
   *    paints a backdrop)
   */
  background?: "default" | "subtle" | "none";
  className?: string;
}) {
  const tone = ACCENT_CLASSES[accent];
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-[8px] border border-white/[0.13]",
        background === "default" && "bg-abyss/[0.8]",
        background === "subtle" && "bg-surface-1/[0.7]",
        background === "none" && "bg-transparent border-transparent",
        background !== "none" &&
          "shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {background === "default" && (
        <>
          <Image
            src="/marketing/lucarne-hero-stadium.jpg"
            alt=""
            fill
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover object-[60%_44%] opacity-[0.2]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(96deg,rgba(5,6,5,0.94)_0%,rgba(5,6,5,0.78)_44%,rgba(5,6,5,0.5)_100%)]" />
        </>
      )}

      <div
        className={cn(
          "relative grid gap-5 p-5 sm:p-7",
          visual && "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-8",
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "mb-3 inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              tone.kicker,
              tone.ring,
            )}
          >
            {KickerIcon && (
              <KickerIcon className="size-3.5" strokeWidth={1.7} />
            )}
            {kicker}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-[15px]">
              {description}
            </p>
          )}
          {actions && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
          {stats && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {stats}
            </div>
          )}
        </div>

        {visual && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[8px] border border-white/[0.1] bg-abyss/[0.6] lg:max-w-md">
            <Image
              src={visual.src}
              alt={visual.alt}
              fill
              priority={visual.priority}
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </header>
  );
}
