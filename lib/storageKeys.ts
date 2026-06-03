// クライアント側ストレージ（localStorage / sessionStorage / cookie）のキーを一元管理する。
// 各所でのハードコード重複を防ぐ（settings のアカウント削除でキー文字列が散在していたため集約）。
export const STORAGE_KEYS = {
  mockMode: "yuzu-mock-mode",          // mock-mode マーク（sessionStorage + cookie）
  dailySessions: "yuzu-daily-sessions", // 1日上限の mock フォールバック（localStorage）
  pendingText: "yuzu_pending_text",     // 未ログイン録音の退避（sessionStorage）
  sentimentCache: "yuzu-sentiment-cache-v2", // センチメントキャッシュ（localStorage）。v1 は失敗時 0 が焼き付くバグがあり wipe 済み
  signalShown: "yuzu-signal-shown",     // SIGNAL カード表示済みマイルストーン（localStorage）
} as const;

// レポート詳細のクライアントキャッシュ（sessionStorage）。
// INSIGHT で取得済みの payload を詳細遷移時に即時描画するために使う。
export const reportCacheKey = (periodKey: string) => `yuzu-report-cache:${periodKey}`;
