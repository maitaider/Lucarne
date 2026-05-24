/**
 * Client-safe money helpers (no `server-only` import). Mirror of the
 * formatters used by lib/admin/economy.ts so client components like the
 * paywall banner can format prices without dragging the whole server
 * module into the bundle.
 */

export function formatMoney(
  cents: number,
  currency: string = "CAD",
  locale: string = "fr-CA",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
