"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

// #68 PostHog セットアップ。
// NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST が未設定なら no-op。
// PII 抑止：post 本文・email はイベントに含めない（呼び出し側で渡さない方針）。
//
// 識別フロー：
// - ログイン直後に posthog.identify(user.id) を auth listener から呼ぶ
// - ログアウトで posthog.reset()
// - 未ログインは distinctId が自動生成され、ログイン後に alias される

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (!key) return; // DSN 未設定環境は noop
    if (typeof window === "undefined") return;
    if (posthog.__loaded) return; // 二重 init 防止
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      // PII 抑止：DOM テキストの自動キャプチャを止める（YUZU は post 本文を絶対送らない）
      mask_all_text: true,
      mask_all_element_attributes: false,
      // 録音モーダル内の本文は autocapture から完全に外す
      autocapture: {
        css_selector_allowlist: [],
      },
      // 開発環境ではデバッグ
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug(false);
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
