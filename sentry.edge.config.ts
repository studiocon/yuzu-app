// Edge runtime 用 Sentry 初期化（middleware.ts や Edge API route 用）。
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_BUILD_NUMBER,
    sendDefaultPii: false,
  });
}
