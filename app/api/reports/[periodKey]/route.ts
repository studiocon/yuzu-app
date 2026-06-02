import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReport, getReport } from "@/lib/reports";
import { isClosed, parsePeriodKey } from "@/lib/period";
import { scoreSentiments } from "@/lib/sentimentScore";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ periodKey: string }> };

interface RecordRow {
  id: string;
  user_id: string;
  text: string;
  char_count: number;
  created_at: string;
}

// 期間 closed のレポートは内容不変。private キャッシュで RTT を節約する。
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=86400",
};

// GET は読み出し専用。未生成なら 404 を返して、生成は POST 側でやらせる。
// scores クエリは取らない（URL を安定させて HTTP キャッシュを効かせるため）。
export async function GET(_req: NextRequest, ctx: Params) {
  const { periodKey } = await ctx.params;
  const period = parsePeriodKey(periodKey);
  if (!period) {
    return NextResponse.json({ error: "invalid_period_key" }, { status: 400 });
  }
  if (!isClosed(periodKey)) {
    return NextResponse.json({ error: "period_in_progress" }, { status: 422 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cached = await getReport(user.id, periodKey);
  if (!cached) {
    return NextResponse.json({ error: "not_generated" }, { status: 404 });
  }
  return NextResponse.json({ report: cached }, { headers: CACHE_HEADERS });
}

// POST は生成。キャッシュ済みならそのまま返す（二重生成抑止）。
export async function POST(req: NextRequest, ctx: Params) {
  const { periodKey } = await ctx.params;
  const period = parsePeriodKey(periodKey);
  if (!period) {
    return NextResponse.json({ error: "invalid_period_key" }, { status: 400 });
  }
  if (!isClosed(periodKey)) {
    return NextResponse.json({ error: "period_in_progress" }, { status: 422 });
  }

  let body: { scores?: Record<string, number> } = {};
  try {
    body = await req.json();
  } catch {}
  const scores = body.scores && typeof body.scores === "object" ? body.scores : {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const cached = await getReport(user.id, periodKey);
    if (cached) {
      return NextResponse.json({ report: cached });
    }

    const { data: rows } = await supabase
      .from("records")
      .select("id, user_id, text, char_count, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(period.start).toISOString())
      .lt("created_at", new Date(period.end).toISOString())
      .order("created_at", { ascending: true });

    const posts: Post[] = (rows as RecordRow[] ?? []).map((r, i) => ({
      id: r.id,
      user_id: r.user_id,
      text: r.text,
      char_count: r.char_count,
      durationMs: 0,
      createdAt: new Date(r.created_at).getTime(),
      index: i + 1,
      marked: false,
    }));

    if (posts.length === 0) {
      return NextResponse.json({ error: "no_posts" }, { status: 404 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "llm_not_configured" }, { status: 503 });
    }

    try {
      // クライアントが渡してこなかったスコアをサーバ側で補完する。
      // 修正前はクライアントの localStorage cache が空だと sentimentSeries が空配列になり、
      // ReportDetail の EMOTION チャートが silent fail（data.length < 3 で null return）していた。
      const missingPosts = posts.filter((p) => typeof scores[p.id] !== "number");
      let fullScores: Record<string, number> = scores;
      if (missingPosts.length > 0 && process.env.ANTHROPIC_API_KEY) {
        const backfilled = await scoreSentiments(
          missingPosts.map((p) => ({ id: p.id, text: p.text })),
          process.env.ANTHROPIC_API_KEY,
        );
        fullScores = { ...scores, ...backfilled };
      }

      const report = await generateReport({
        userId: user.id,
        periodKey,
        posts,
        scores: fullScores,
      });
      return NextResponse.json({ report });
    } catch (e) {
      console.error("generateReport failed", e);
      return NextResponse.json({ error: "llm_failed" }, { status: 502 });
    }
  } catch (e) {
    console.error("report fetch failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
