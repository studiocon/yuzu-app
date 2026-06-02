// サーバ側 Sentry 初期化（Node.js runtime のみ。Edge は sentry.edge.config.ts）。
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_BUILD_NUMBER,

    // PII 抑止
    sendDefaultPii: false,

    // post 本文・email を絶対に送らない
    beforeSend(event) {
      // request body をスクラブ
      if (event.request?.data) {
        event.request.data = "[Filtered]";
      }
      // headers の Authorization と cookie を削る
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h.authorization;
        delete h.cookie;
        delete h.Authorization;
        delete h.Cookie;
      }
      return event;
    },
  });
}
