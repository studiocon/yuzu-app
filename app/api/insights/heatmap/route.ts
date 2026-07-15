import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { buildHeatmap } from "@/lib/heatmap";
import { DAY_MS } from "@/lib/period";
import { buildMockPosts, isMockRequest } from "@/lib/mockFixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecordRow {
  text: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 管理者限定モックモード。実 DB ではなく固定フィクスチャに対して実ロジックを走らせる。
  if (await isMockRequest(request, supabase, user.id)) {
    const cells = buildHeatmap(
      buildMockPosts(user.id).map((p) => ({ text: p.text, createdAt: p.createdAt })),
    );
    return NextResponse.json({ cells });
  }

  const cutoff = new Date(Date.now() - 28 * DAY_MS).toISOString();
  const { data, error } = await supabase
    .from("records")
    .select("text, created_at")
    .eq("user_id", user.id)
    .gte("created_at", cutoff);

  if (error) {
    console.error("GET /api/insights/heatmap:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const cells = buildHeatmap(
    ((data ?? []) as RecordRow[]).map((r) => ({
      text: r.text,
      createdAt: new Date(r.created_at).getTime(),
    })),
  );

  return NextResponse.json(
    { cells },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
