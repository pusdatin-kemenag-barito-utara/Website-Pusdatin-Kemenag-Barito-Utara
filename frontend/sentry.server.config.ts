import * as Sentry from "@sentry/astro";

const dsn = process.env.PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Free Tier Optimization: 10% sampling in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}
