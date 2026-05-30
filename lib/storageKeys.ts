// クライアント側ストレージ（localStorage / sessionStorage / cookie）のキーを一元管理する。
// 各所でのハードコード重複を防ぐ（settings のアカウント削除でキー文字列が散在していたため集約）。
export const STORAGE_KEYS = {
  mockMode: "yuzu-mock-mode",          // mock-mode マーク（sessionStorage + cookie）
  dailySessions: "yuzu-daily-sessions", // 1日上限の mock フォールバック（localStorage）
  pendingText: "yuzu_pending_text",     // 未ログイン録音の退避（sessionStorage）
  sentimentCache: "yuzu-sentiment-cache", // センチメントキャッシュ（localStorage）
  signalShown: "yuzu-signal-shown",     // SIGNAL カード表示済みマイルストーン（localStorage）
} as const;
