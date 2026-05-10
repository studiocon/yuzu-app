// クライアント側のユーザープロフィール（ニックネーム・登録日・感情キャッシュ）
// userId/sessionIdはサーバーCookie(yuzu_sid)由来 → /api/postsレスポンスから受け取る。
// V2でSupabase Authに移行する際は、サーバー側のセッション解決をauthに差し替えるだけでよい。

export const NICKNAME_KEY = "yuzu-nickname";
export const REGISTERED_AT_KEY = "yuzu-registered-at";
export const SENTIMENT_CACHE_KEY = "yuzu-sentiment-cache";

export const FRUIT_NAMES: Record<string, string> = {
  "🍑": "もも",
  "🍋": "レモン",
  "🍇": "ぶどう",
  "🥝": "キウイ",
  "🍓": "いちご",
  "🫐": "ブルーベリー",
  "🍈": "メロン",
  "🍊": "オレンジ",
  "🍍": "パイナップル",
  "🥭": "マンゴー",
  "🍌": "バナナ",
  "🍒": "さくらんぼ",
  "🍎": "りんご",
  "🍐": "なし",
  "🫒": "オリーブ",
};

const safeGet = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key: string, value: string): void => {
  try { localStorage.setItem(key, value); } catch {}
};

export function getNickname(emoji: string): string {
  const stored = safeGet(NICKNAME_KEY);
  if (stored && stored.trim()) return stored;
  return FRUIT_NAMES[emoji] ?? "ゲスト";
}

export function setNickname(name: string): void {
  safeSet(NICKNAME_KEY, name.trim());
}

export function getRegisteredAt(): number {
  const raw = safeGet(REGISTERED_AT_KEY);
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  const now = Date.now();
  safeSet(REGISTERED_AT_KEY, String(now));
  return now;
}

export function getDaysSinceRegistered(): number {
  return Math.floor((Date.now() - getRegisteredAt()) / 86400000) + 1;
}

export function loadSentimentCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SENTIMENT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, number>) : {};
  } catch { return {}; }
}

export function saveSentimentCache(cache: Record<string, number>): void {
  try { localStorage.setItem(SENTIMENT_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
