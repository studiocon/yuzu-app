// クライアント側 Sentry 初期化。Next.js App Router 統合の標準パターン。
// SENTRY_DSN は Vercel 環境変数で設定する（プレビュー / 本番ともに必須）。
// DSN 未設定の環境（ローカル開発）では init を skip して noop に。
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // 本番のみ tracesSampleRate を 0.1 に。ローカルや preview は 1.0 で全部追う
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_BUILD_NUMBER,

    // PII 抑止：YUZU は post 本文（声の中身）を絶対に Sentry に送らない
    sendDefaultPii: false,

    // ユーザー入力が含まれそうな breadcrumb は data を削る
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        if (breadcrumb.data?.url?.includes("/api/transcribe")) {
          // STT 結果が breadcrumb に乗らないように body を削る
          breadcrumb.data = { url: breadcrumb.data.url, method: breadcrumb.data.method };
        }
      }
      return breadcrumb;
    },

    // 既知の無視できるエラー
    ignoreErrors: [
      // ブラウザ拡張機能由来
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network blip
      "NetworkError",
      "Failed to fetch",
    ],
  });
}
