// 問い合わせ機能のサーバ/クライアント共有定数。
// migration（supabase/migrations/20260531083245_inquiries.sql）の CHECK 制約と一致させる。
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

// #129: レート制限に使うキーを user_id → email → IP の優先順で選ぶ。
// user_id / email がどちらも無い匿名 POST は IP にフォールバックする（それまでは
// countRecent が 0 件判定になり、5件/時の上限を素通りできた）。
// IP が "unknown"（Vercel/XFF ヘッダ欠落時のプレースホルダ、lib/ip.ts 参照）の場合は
// 全匿名ユーザーが同一バケットを共有してしまうため、レート制限キーとして使わない
// （= type: "none" を返し、上限チェックをスキップする。cookie 等の別防波堤は無いが、
// 少なくとも誤って全匿名トラフィックを一律ブロックする事故は避ける）。
export type InquiryRateLimitKey =
  | { type: "user"; value: string }
  | { type: "email"; value: string }
  | { type: "ip"; value: string }
  | { type: "none" };

export function pickInquiryRateLimitKey(
  userId: string | null | undefined,
  email: string | null | undefined,
  ip: string | null | undefined,
): InquiryRateLimitKey {
  if (userId) return { type: "user", value: userId };
  if (email) return { type: "email", value: email };
  if (ip && ip !== "unknown") return { type: "ip", value: ip };
  return { type: "none" };
}
