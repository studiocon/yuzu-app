import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // pending post があれば "/" でマウント時に拾って保存する
      const hasPending =
        searchParams.get("pending") === "1" ? "?pendingPost=1" : "";
      return NextResponse.redirect(`${origin}${next}${hasPending}`);
    }
  }

  // エラー時はホームへ戻す（エラーページは作らない）
  return NextResponse.redirect(`${origin}/`);
}
