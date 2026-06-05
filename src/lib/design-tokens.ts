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

  // Primary — pelouse irradiée (full 50→900 ramp; 400/500/600 = brand)
  primary50: "#eafdf3",
  primary100: "#c8f8de",
  primary200: "#97f1c4",
  primary300: "#66eaa9",
  primary400: "#3fe599",
  primary500: "#22d982",
  primary600: "#16b26b",
  primary700: "#128c55",
  primary800: "#0f6e44",
  primary900: "#0c5435",

  // Gold — trophée
  gold50: "#fffaea",
  gold100: "#fff1c9",
  gold200: "#ffe7a3",
  gold300: "#ffde84",
  gold400: "#ffd66b",
  gold500: "#f5c447",
  gold600: "#d6a423",
  gold700: "#ad831c",
  gold800: "#876615",
  gold900: "#654d10",

  // Violet — écran live
  violet50: "#f1eeff",
  violet100: "#ded6ff",
  violet200: "#c4b5ff",
  violet300: "#ad97ff",
  violet400: "#9a82ff",
  violet500: "#7c5cff",
  violet600: "#5d3ee0",
  violet700: "#4a30b8",
  violet800: "#382593",
  violet900: "#2a1c70",

  // Amber — bronze (3e place), trophées (canonical Tailwind ramp)
  amber100: "#fef3c7",
  amber300: "#fcd34d",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber700: "#b45309",

  // Emerald — vert secondaire
  emerald300: "#6ee7b7",
  emerald500: "#10b981",

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
