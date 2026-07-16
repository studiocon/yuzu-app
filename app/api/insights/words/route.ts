import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { extractWordFrequencies } from "@/lib/wordAnalysis";
import { buildMockPosts, isMockRequest } from "@/lib/mockFixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// #145: 取得を有界にする。旧実装は全期間の text を無制限に SELECT しており、多年ユーザー
// （数千行・数百KB〜MB）で毎回全本文を取得し TinySegmenter を同期実行していた（口座年齢に線形）。
// themes（最新 50 件）/ heatmap（直近 28 日）と同じく直近件数で頭打ちにする。語頻度クラウドは
// themes より広いサンプルが欲しいので上限は大きめに取る。
const MAX_POSTS_FOR_WORDS = 500;

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 管理者限定モックモード。実 DB ではなく固定フィクスチャに対して実ロジックを走らせる。
  if (await isMockRequest(request, supabase, user.id)) {
    const words = extractWordFrequencies(buildMockPosts(user.id).map((p) => p.text));
    return NextResponse.json({ words });
  }

  const { data, error } = await supabase
    .from("records")
    .select("text")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_POSTS_FOR_WORDS);

  if (error) {
    console.error("GET /api/insights/words:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const texts = (data ?? []).map((r) => (r as { text: string }).text);
  const words = extractWordFrequencies(texts);

  return NextResponse.json(
    { words },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
