import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supabase keepalive 兼ヘルスチェック。
// Free tier は 7 日間 API リクエストがゼロだと Pause するため、
// GitHub Actions cron から毎日ここを叩いて DB に小さな読み取りを発生させる。
// service_role で軽量な count(*) を叩くだけ（RLS バイパスして本当に DB に届かせる）。
export async function GET() {
  const t0 = Date.now();
  // 環境変数の存在のみチェック（値は出さない）
  const env = {
    url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
  if (!env.url || !env.serviceRole) {
    return NextResponse.json(
      { ok: false, stage: "env", env, durationMs: Date.now() - t0 },
      { status: 503 },
    );
  }
  try {
    const supabase = createAdminClient();
    // 単純な select で 1 行だけ取る（profiles が空でも data=[] で error=null になる）
    const { data, error } = await supabase.from("profiles").select("id").limit(1);
    if (error) {
      // #146: 無認証エンドポイントなので DB エラーの中身（PostgREST の詳細）は応答に出さない。
      // 診断はサーバログに残す。応答は ok/stage/durationMs の最小限のみ。
      console.error("GET /api/health query error:", error);
      return NextResponse.json(
        { ok: false, stage: "query", durationMs: Date.now() - t0 },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      t: Date.now(),
      durationMs: Date.now() - t0,
      rows: Array.isArray(data) ? data.length : 0,
    });
  } catch (e) {
    // #146: スタックトレースを無認証で返さない。診断はサーバログに残す。
    console.error("GET /api/health exception:", e);
    return NextResponse.json(
      { ok: false, stage: "exception", durationMs: Date.now() - t0 },
      { status: 503 },
    );
  }
}
