/// <reference types="astro/client" />
import * as Sentry from "@sentry/astro";

// Get DSN from env or SSR-injected public env window
const env = (import.meta as any).env || {};
const dsn =
  env.PUBLIC_SENTRY_DSN ||
  env.SENTRY_DSN ||
  (typeof window !== "undefined" && (window as any).__PUBLIC_ENV__?.PUBLIC_SENTRY_DSN);

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Free Tier Optimization: 10% sampling in production, 100% in development
    tracesSampleRate: env.PROD ? 0.1 : 1.0,

    // Free Tier Optimization: 0% session replay for normal sessions (to save monthly replay quota)
    // and 100% replay capture only when an error actually occurs!
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,

    environment: env.MODE || (env.PROD ? "production" : "development"),

    // Ignore benign browser & extension noise to protect free tier quota
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Network request failed",
      "Load failed",
      "AbortError",
      "Non-Error promise rejection captured",
      "Failed to fetch",
    ],

    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    beforeSend(event, hint) {
      // Discard errors caused by client-side browser extensions
      const error = hint?.originalException as Error | undefined;
      if (error?.stack && (error.stack.includes("chrome-extension://") || error.stack.includes("moz-extension://"))) {
        return null;
      }
      return event;
    },
  });
}

