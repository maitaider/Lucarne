/**
 * Lucarne — Design tokens (TypeScript export)
 *
 * Mirror of `globals.css` for programmatic use (e.g., dynamic OG images,
 * Motion variants, canvas drawing). Update both in sync.
 */

export const colors = {
  // Backgrounds & surfaces — "stade nocturne" (green-dark)
  abyss: "#050605",
  base: "#0c0f0c",
  surface1: "#11160f",
  surface2: "#192119",
  surface3: "#253024",

  // Borders
  borderSubtle: "#2b362a",
  borderStrong: "#4c5a47",

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
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

export const easings = {
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  outBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

export type ColorToken = keyof typeof colors;
