"use client";

// ルートレイアウトごとクラッシュした時のフォールバック。layout.tsx は描画されないので
// <html><body> を自前で持つ必要がある（Next.js App Router の規約）。
// Sentry の App Router 対応はこのファイルが無いとレンダーエラーを一切捕捉できないため必須。
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p className="reports-empty-headline font-display">BROKEN</p>
          <p className="reports-empty-body">壊れた。読み込み直せ。</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            RELOAD
          </button>
        </div>
      </body>
    </html>
  );
}
