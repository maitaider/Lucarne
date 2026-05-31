import { cn } from "@/lib/utils";

/** Derive up to two uppercase initials from a display name or username. */
function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Renders a user's avatar photo when `src` is set, otherwise an initials badge.
 *
 * Shared across the leaderboard, social feed, comments and admin tables so the
 * image/initials fallback lives in one place. Sizing, ring and shadow go in
 * `className` (applied to both image and badge); background/text styling for the
 * initials fallback goes in `fallbackClassName`. Pure presentational — safe in
 * both Server and Client Components.
 */
export function UserAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  /** Public avatar URL, or null/undefined to show initials. */
  src: string | null | undefined;
  /** Display name or username — used to derive the initials fallback. */
  name: string;
  /** Sizing + ring + shadow — applied to both image and badge. Must set a size (e.g. `size-8`). */
  className?: string;
  /** Background + text styling for the initials fallback only (gradient, font, colour). */
  fallbackClassName?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URLs; matches the rest of the app's avatar rendering.
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full uppercase",
        className,
        fallbackClassName,
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}
