// クライアント側のユーザープロフィール（ニックネーム・感情キャッシュ）
// ニックネームは Supabase profiles.nickname と localStorage の両方に保持する（オフラインフォールバック）。

export const NICKNAME_KEY = "yuzu-nickname";
export const SENTIMENT_CACHE_KEY = "yuzu-sentiment-cache";

export const FRUIT_CODES: Record<string, string> = {
  "🍑": "MO",
  "🍋": "LE",
  "🍇": "BU",
  "🥝": "KI",
  "🍓": "IC",
  "🫐": "BL",
  "🍈": "ME",
  "🍊": "OR",
  "🍍": "PA",
  "🥭": "MA",
  "🍌": "BA",
  "🍒": "SA",
  "🍎": "AP",
  "🍐": "NA",
  "🫒": "OL",
};

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
