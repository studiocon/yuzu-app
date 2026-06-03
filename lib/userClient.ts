// クライアント側のユーザー関連ストア（感情キャッシュのみ）。
// v2 以降、ユーザー identity は通し番号 `#NNN` のみ。
// ニックネーム / 果物アイコンの概念は廃止。DB カラムは残るが UI 不参照。

import { STORAGE_KEYS } from "./storageKeys";

export const SENTIMENT_CACHE_KEY = STORAGE_KEYS.sentimentCache;

export function loadSentimentCache(): Record<string, number> {
  try {
    // v1 は解析失敗時に score=0 を焼き付けるバグがあったため、見つけたら一度だけ捨てる。
    try { localStorage.removeItem("yuzu-sentiment-cache"); } catch {}
    const raw = localStorage.getItem(SENTIMENT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, number>) : {};
  } catch { return {}; }
}

export function saveSentimentCache(cache: Record<string, number>): void {
  try { localStorage.setItem(SENTIMENT_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
