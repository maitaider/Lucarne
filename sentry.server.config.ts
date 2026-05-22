/**
 * Sentry — server-side initialization.
 *
 * Activated only when SENTRY_DSN is set. In dev/CI without DSN, this file
 * is effectively a no-op.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    debug: false,
  });
}
