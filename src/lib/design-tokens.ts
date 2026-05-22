/**
 * Lucarne — Design tokens (TypeScript export)
 *
 * Mirror of `globals.css` for programmatic use (e.g., dynamic OG images,
 * Motion variants, canvas drawing). Update both in sync.
 */

export const colors = {
  // Backgrounds & surfaces
  abyss: "#08090c",
  base: "#0e1014",
  surface1: "#161922",
  surface2: "#1f2330",
  surface3: "#2a2f3f",

  // Borders
  borderSubtle: "#262b38",
  borderStrong: "#3a4055",

  // Primary — pelouse irradiée
  primary400: "#3fe599",
  primary500: "#22d982",
  primary600: "#16b26b",

  // Gold — trophée
  gold400: "#ffd66b",
  gold500: "#f5c447",
  gold600: "#d6a423",

  // Violet — écran live
  violet400: "#9a82ff",
  violet500: "#7c5cff",
  violet600: "#5d3ee0",

  // Semantic
  success: "#22d982",
  warning: "#f5a623",
  error: "#f25555",
  info: "#5bb8ff",

  // Text
  textPrimary: "#f2f4f8",
  textSecondary: "#9ba3b5",
  textTertiary: "#5c6478",
  textDisabled: "#3d4255",
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  "2xl": 28,
  full: 9999,
} as const;

export const easings = {
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  outBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export type ColorToken = keyof typeof colors;
