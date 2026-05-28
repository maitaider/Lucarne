import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"] as const,
  defaultLocale: "fr",
  localePrefix: "always",
  // French is the default for everyone: don't auto-switch to English just
  // because the browser's Accept-Language says so. Users pick a language
  // explicitly via the header switcher (persisted in the URL prefix).
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
