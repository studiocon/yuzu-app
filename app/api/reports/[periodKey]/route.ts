import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReport, getReport } from "@/lib/reports";
import { isClosed, parsePeriodKey } from "@/lib/period";
import type { Post } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ periodKey: string }> };

function parseScoresParam(value: string | null): Record<string, number> {
  if (!value) return {};
  const out: Record<string, number> = {};
  for (const pair of value.split(",")) {
    const [id, raw] = pair.split(":");
    if (!id || raw === undefined) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[id] = Math.max(-1, Math.min(1, n));
  }
  return out;
}

interface RecordRow {
  id: string;
  user_id: string;
  text: string;
  char_count: number;
  created_at: string;
}

async function handle(req: NextRequest, params: { periodKey: string }, scores: Record<string, number>) {
  const { periodKey } = params;
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

  try {
    const cached = await getReport(user.id, periodKey);
    if (cached) {
      return NextResponse.json({ report: cached });
    }

    // 期間内の投稿を取得
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
      durationMs: 0, // レポート生成は text のみ参照。duration 不要。
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
      // generateReport は全投稿を渡す（期間フィルタは内部で行う）
      // ここでは期間内の投稿のみを渡す
      const report = await generateReport({
        userId: user.id,
        periodKey,
        posts,
        scores,
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

export async function GET(req: NextRequest, ctx: Params) {
  const params = await ctx.params;
  const url = new URL(req.url);
  const scores = parseScoresParam(url.searchParams.get("scores"));
  return handle(req, params, scores);
}

export async function POST(req: NextRequest, ctx: Params) {
  const params = await ctx.params;
  let body: { scores?: Record<string, number> } = {};
  try {
    body = await req.json();
  } catch {}
  const scores = body.scores && typeof body.scores === "object" ? body.scores : {};
  return handle(req, params, scores);
}
