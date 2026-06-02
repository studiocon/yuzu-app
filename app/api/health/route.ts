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
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, durationMs: Date.now() - t0 },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, t: Date.now(), durationMs: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e), durationMs: Date.now() - t0 },
      { status: 503 },
    );
  }
}
