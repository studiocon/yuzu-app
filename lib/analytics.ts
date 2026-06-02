// PostHog ラッパ。PII 抑止と silent-failure 防止のため
// イベント発火は **このファイル経由のみ** にする（直接 posthog.capture を呼ばない）。
//
// イベント命名規則：snake_case + 過去形 / 進行形を統一
//   - record_started / record_finished
//   - transcribe_succeeded / transcribe_failed
//   - post_created
//   - login_attempted / login_succeeded
//   - daily_limit_hit
//   - paywall_shown / paywall_dismissed   (#83 用、課金導入後)
//   - report_opened

import posthog from "posthog-js";

type EventName =
  | "record_started"
  | "record_finished"
  | "transcribe_succeeded"
  | "transcribe_failed"
  | "post_created"
  | "login_attempted"
  | "login_succeeded"
  | "daily_limit_hit"
  | "paywall_shown"
  | "paywall_dismissed"
  | "report_opened";

// イベントに含めて良い properties の型。
// post 本文・email・電話番号など PII を絶対に含めないようホワイトリスト化。
type EventProps = {
  // 録音メタ
  durationMs?: number;
  charCount?: number;
  // login 経路
  provider?: "google" | "apple" | "magic_link";
  // STT エラー種別
  errorCode?: string;
  // レポート期間
  periodKey?: string;
  periodKind?: "week" | "month";
};

export function track(name: EventName, props?: EventProps): void {
  try {
    if (typeof window === "undefined") return;
    if (!posthog.__loaded) return; // PostHog 未初期化なら noop
    posthog.capture(name, props as Record<string, unknown> | undefined);
  } catch {
    // 解析の失敗が本体に影響しないように silent fail（解析側は壊れても UX は壊れない）
  }
}

// ログイン直後に呼ぶ。userId は Supabase の auth.users.id（UUID）。
// 未ログイン時の distinctId を userId に alias する。
export function identify(userId: string): void {
  try {
    if (typeof window === "undefined") return;
    if (!posthog.__loaded) return;
    posthog.identify(userId);
  } catch {
    // noop
  }
}

// ログアウト時に呼ぶ。distinctId をリセットして新しい匿名 ID を発行。
export function resetIdentity(): void {
  try {
    if (typeof window === "undefined") return;
    if (!posthog.__loaded) return;
    posthog.reset();
  } catch {
    // noop
  }
}
