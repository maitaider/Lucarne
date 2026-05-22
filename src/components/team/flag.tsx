import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<Size, { w: number; h: number; cdn: "16x12" | "20x15" | "24x18" | "40x30" | "48x36" | "80x60" }> = {
  xs: { w: 16, h: 12, cdn: "16x12" },
  sm: { w: 20, h: 15, cdn: "20x15" },
  md: { w: 24, h: 18, cdn: "24x18" },
  lg: { w: 40, h: 30, cdn: "40x30" },
  xl: { w: 48, h: 36, cdn: "48x36" },
  "2xl": { w: 80, h: 60, cdn: "80x60" },
};

/**
 * Country flag rendered from flagcdn.com (PNG, retina). Falls back to a
 * unicode flag emoji when iso_code is missing.
 *
 * iso_code must be a 2-letter ISO 3166-1 alpha-2 code (lowercase).
 */
export function Flag({
  isoCode,
  emoji,
  size = "md",
  className,
  rounded = true,
}: {
  isoCode: string | null;
  emoji?: string | null;
  size?: Size;
  className?: string;
  rounded?: boolean;
}) {
  const { w, h, cdn } = sizeMap[size];

  if (!isoCode) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center leading-none",
          className,
        )}
        style={{ width: w, height: h, fontSize: Math.round(h * 0.95) }}
      >
        {emoji ?? "🏳️"}
      </span>
    );
  }

  const code = isoCode.toLowerCase();
  // 2x retina via flagcdn pattern: cdn /{wxh}/{code}.png  retina /{w*2 x h*2}
  const src = `https://flagcdn.com/${cdn}/${code}.png`;
  const srcSet = `https://flagcdn.com/${w * 2}x${h * 2}/${code}.png 2x, https://flagcdn.com/${w * 3}x${h * 3}/${code}.png 3x`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      width={w}
      height={h}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn(
        "inline-block shrink-0 select-none object-cover shadow-[0_1px_0_rgba(0,0,0,0.4)]",
        rounded ? "rounded-[3px] ring-1 ring-black/20" : "",
        className,
      )}
      style={{ width: w, height: h }}
    />
  );
}
