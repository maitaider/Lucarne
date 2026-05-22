/**
 * Static constants for the admin module. Kept separate so client
 * components and "use server" action files can both import them.
 */

export const PAYMENT_METHODS = [
  "cash",
  "transfer",
  "paypal",
  "revolut",
  "lydia",
  "wise",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
