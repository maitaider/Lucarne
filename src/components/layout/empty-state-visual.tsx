import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Premium empty state with one of the Claude pack SVG assets as the
 * visual centerpiece.
 *
 * Use for:
 *   - Pages with no data yet (no news posts, no live matches, no leagues)
 *   - Onboarding sections inside a page (no picks made, no champion picked)
 *
 * Don't use for:
 *   - Simple "no rows" lists — use a small text panel instead.
 *   - Loading skeletons — use a dedicated skeleton.
 *
 * The visual is rendered at 16:10 so it pairs cleanly with the asset
 * pack (1600×1000 source). Pass `compact` to halve the visual height
 * when the empty state sits inside a tight section.
 */
export function EmptyStateVisual({
  src,
  alt,
  title,
  body,
  action,
  compact = false,
  className,
}: {
  src: string;
  alt: string;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-sm border border-dashed border-white/[0.12] bg-surface-1/[0.4] p-5 text-center backdrop-blur-xl sm:p-7",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-sm border border-white/[0.08] bg-abyss/[0.5]",
          compact ? "aspect-[16/8] max-w-md" : "aspect-[16/10] max-w-xl",
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>
      <div className="max-w-md space-y-1.5">
        <h3 className="font-display text-base font-semibold text-text-primary sm:text-lg">
          {title}
        </h3>
        {body && (
          <p className="text-sm leading-6 text-text-secondary">{body}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
