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

// #129: レート制限に使うキー群を選ぶ。呼び出し側は返された**全キー**でカウントし、
// 最大値で上限判定する（max 判定）。
//
// - ログイン済み（userId あり）→ user_id キーのみ（従来通り。email/IP は見ない）
// - 匿名（userId 無し）→ email と IP の**両方**を返す。email は自己申告値でコスト0で
//   ローテートできるため、email キー単独では「毎回違う email を入れる」だけで
//   カウント0の新バケットに逃げられる（issue #129 が明記する主要ケース）。IP でも
//   並行してカウントすることで、email をどう変えても同一 IP からの 5件/時 を超えられない
// - IP が "unknown"（Vercel/XFF ヘッダ欠落時のプレースホルダ、lib/ip.ts 参照）の場合は
//   IP キーとして使わない。全匿名ユーザーが同一バケットを共有してしまい、正規ユーザーを
//   誤って一律ブロックする事故を避けるため
// - email も有効な IP も無ければ空配列（= 上限チェックなし。従来挙動の維持）
export type InquiryRateLimitKey =
  | { type: "user"; value: string }
  | { type: "email"; value: string }
  | { type: "ip"; value: string };

export function pickInquiryRateLimitKeys(
  userId: string | null | undefined,
  email: string | null | undefined,
  ip: string | null | undefined,
): InquiryRateLimitKey[] {
  if (userId) return [{ type: "user", value: userId }];
  const keys: InquiryRateLimitKey[] = [];
  if (email) keys.push({ type: "email", value: email });
  if (ip && ip !== "unknown") keys.push({ type: "ip", value: ip });
  return keys;
}
