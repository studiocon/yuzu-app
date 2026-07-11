"use client";

// セグメント単位のエラーバウンダリ。layout.tsx は生きているので globals.css は再 import しない。
// Sentry の App Router 対応（レンダーエラー捕捉）に必須。
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
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
      <button type="button" className="btn btn--primary" onClick={() => reset()}>
        RELOAD
      </button>
    </div>
  );
}
