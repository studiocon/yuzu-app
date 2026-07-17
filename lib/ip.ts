import type { NextRequest } from "next/server";

// #142: x-forwarded-for はクライアントが送った値が混ざりうる（先頭を偽装して IP バケットを
// 割り、レート制限を回避できる）ため先頭値をそのまま信用しない。Vercel が自エッジで付与する
// x-vercel-forwarded-for / x-real-ip（クライアントからは偽装不可）を優先し、無ければ
// dev 用に x-forwarded-for 先頭へフォールバックする。欠落時は "unknown" バケット。
//
// app/api/transcribe/route.ts の匿名 STT レート制限で最初に導入したロジック。
// IP を使うレート制限は必ずここを経由し、独自に x-forwarded-for を生パースしない
// （#129 の inquiries IP フォールバックもこれを使う）。
export function getClientIp(req: NextRequest): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
