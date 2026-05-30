// 問い合わせ機能のサーバ/クライアント共有定数。
// migration（supabase/migrations/0010_inquiries.sql）の CHECK 制約と一致させる。
// 値を変えるときは migration → ここ → API route の順で同期する。

export const INQUIRY_SUBJECT_MAX = 200;
export const INQUIRY_BODY_MAX = 4000;

// レート制限：1 時間あたり同一 user_id / email で N 件まで。
export const INQUIRY_RATE_WINDOW_MS = 60 * 60 * 1000;
export const INQUIRY_RATE_MAX = 5;

// 簡易 email 形式チェック。厳密でなくて良い（最終確認は人間が見る）。
export function isLooselyValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
