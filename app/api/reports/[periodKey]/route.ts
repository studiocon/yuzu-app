import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getAuthedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { failReportJob, getReport, getReportJob, REPORT_JOB_STALE_MS, runReportJob, startReportJob } from "@/lib/reports";
import { isClosed, parsePeriodKey } from "@/lib/period";
import { buildMockReport, isMockRequest } from "@/lib/mockFixtures";
import type { Report } from "@/lib/reportTypes";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ periodKey: string }> };

// 期間 closed のレポートは内容不変。private キャッシュで RTT を節約する。
const CACHE_HEADERS = {
  "Cache-Control": "private, max-age=300, stale-while-revalidate=86400",
};

// ジョブが「進行中」とみなせる猶予。maxDuration(60s) + 前後のオーバーヘッドぶんのバッファ。
// これを超えて pending のままなら、関数が kill されて放棄されたとみなし POST での再試行を許す。
// start_report_job RPC の stale 判定（lib/reports.ts）と同じ値を使う。
const JOB_STALE_MS = REPORT_JOB_STALE_MS;

// GET は読み出し専用。生成は POST に任せる。
// - reports にキャッシュ済み → 200 { report }
// - report_jobs が pending（かつ新しい）→ 202 { status: "pending" }（クライアントはポーリング継続）
// - report_jobs が failed → 502 { error, status: "failed" }
// - どちらも無い/古い → 404 { error: "not_generated" }（クライアントは POST で起動する）
export async function GET(req: NextRequest, ctx: Params) {
  const { periodKey } = await ctx.params;
  const period = parsePeriodKey(periodKey);
  if (!period) {
    return NextResponse.json({ error: "invalid_period_key" }, { status: 400 });
  }
  if (!isClosed(periodKey)) {
    return NextResponse.json({ error: "period_in_progress" }, { status: 422 });
  }
  const { supabase, user } = await getAuthedClient(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 管理者限定モックモード。ネイティブのポーリングが実生成を叩かないよう即 200 で返す。
  if (await isMockRequest(req, supabase, user.id)) {
    const report = buildMockReport(periodKey);
    return report
      ? NextResponse.json({ report }, { headers: CACHE_HEADERS })
      : NextResponse.json({ error: "not_generated" }, { status: 404 });
  }

  // getReport は読み取りエラー時に throw する（#138、「未生成」と誤認させない）。
  // ここは reports API の入口なので明示的に catch し、silent fail にせず 500 で返す。
  let cached: Report | null;
  try {
    cached = await getReport(user.id, periodKey);
  } catch (e) {
    console.error("GET /api/reports/[periodKey] getReport failed", periodKey, e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  if (cached) {
    return NextResponse.json({ report: cached }, { headers: CACHE_HEADERS });
  }

  const job = await getReportJob(user.id, periodKey);
  if (job) {
    if (job.status === "failed") {
      return NextResponse.json({ error: job.error ?? "llm_failed", status: "failed" }, { status: 502 });
    }
    if (Date.now() - job.startedAt < JOB_STALE_MS) {
      return NextResponse.json({ status: "pending" }, { status: 202 });
    }
    // stale: 関数が kill されて放棄された可能性が高い。not_generated として扱い、
    // クライアントの POST 再試行（= 新しいジョブの起動）に任せる。
  }

  return NextResponse.json({ error: "not_generated" }, { status: 404 });
}

// POST は生成を起動する。Claude 呼び出しは待たず、waitUntil でレスポンス後もバックグラウンド継続する
// （MONTH 等ボリュームの大きい期間で Vercel の maxDuration に頭打ちしてタイムアウトする問題への対応。
// 旧実装は生成完了までブロックしていたため、maxDuration を超えると関数ごと kill され、
// reports には何も保存されず「毎回同じ失敗を繰り返す」状態になっていた）。
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
  } catch {
    // 本文なしは許容（スコア補完はサーバ側で全件行う）
  }
  const scores = body.scores && typeof body.scores === "object" ? body.scores : {};

  const { supabase, user } = await getAuthedClient(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 管理者限定モックモード。実生成（Claude 呼び出し）を一切起動しない。
  if (await isMockRequest(req, supabase, user.id)) {
    const report = buildMockReport(periodKey);
    return report
      ? NextResponse.json({ report })
      : NextResponse.json({ error: "not_generated" }, { status: 404 });
  }

  // 二重生成抑止：キャッシュ済みならそのまま返す（待たせない）。
  // getReport は読み取りエラー時に throw するので、ここで揉み消して「未生成」扱いに
  // しない（そのまま regenerate に進むと余分な Claude 呼び出し + 上書き保存が起きる）。
  let cached: Report | null;
  try {
    cached = await getReport(user.id, periodKey);
  } catch (e) {
    console.error("POST /api/reports/[periodKey] getReport failed", periodKey, e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  if (cached) {
    return NextResponse.json({ report: cached });
  }

  // 進行中の別リクエスト（先読み生成 or 別タブ）があれば新たに起動しない。
  const existingJob = await getReportJob(user.id, periodKey);
  if (existingJob && existingJob.status === "pending" && Date.now() - existingJob.startedAt < JOB_STALE_MS) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  // 投稿ゼロは生成を待たせず即座にフィードバックする（軽量な count のみ）。
  const admin = createAdminClient();
  const { count } = await admin
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(period.start).toISOString())
    .lt("created_at", new Date(period.end).toISOString());
  if (!count) {
    return NextResponse.json({ error: "no_posts" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "llm_not_configured" }, { status: 503 });
  }

  // #143: 起動権の取得を原子化する。startReportJob は条件付き upsert で「起動してよいか」を
  // 返す。二重 POST では勝者だけが true を受け取り、敗者は false → 202 pending（相乗り）に
  // なるので Claude 呼び出しが 2 回走らない。書き込み失敗は握り潰さず 500 で中断する
  // （ジョブ行が無いまま生成だけ走ると 404→再 POST を繰り返しかねないため）。
  let started: boolean;
  try {
    started = await startReportJob(user.id, periodKey);
  } catch (e) {
    console.error("startReportJob failed", periodKey, e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  if (!started) {
    // 別リクエストが既に生成中。相乗りしてポーリングに任せる。
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }
  // レスポンスは即座に返す。実際の Claude 呼び出し + 保存はレスポンス後もこの関数インスタンスの
  // 寿命が尽きるまで（maxDuration 上限まで）継続する。失敗時は runReportJob 内で必ず
  // failReportJob を呼ぶので、クライアントは次の GET/POST で失敗を検知できる。
  waitUntil(
    runReportJob({ userId: user.id, periodKey, clientScores: scores }).catch(async (e) => {
      // runReportJob は内部で catch して必ず failReportJob を呼ぶ設計だが、万一ここまで
      // 例外が抜けてきた場合の最終防波堤。clearReportJob（削除）は絶対に使わない：
      // ジョブ行を消すと reports にも report_jobs にも行が無い状態になり、クライアントの
      // GET が 404 → 再 POST → 再生成、を無限に繰り返す（#138）。
      console.error("runReportJob unexpected throw", periodKey, e);
      const message = e instanceof Error ? e.message : "unknown_error";
      await failReportJob(user.id, periodKey, message).catch((failErr) => {
        console.error("failReportJob also failed after unexpected throw", periodKey, failErr);
      });
    }),
  );

  return NextResponse.json({ status: "pending" }, { status: 202 });
}
