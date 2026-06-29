import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthedClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import { jstDateString } from "@/lib/period";
import { MAX_DAILY_SESSIONS, MAX_RECORD_MS } from "@/lib/constants";

// ── ページネーション設定 ─────────────────────────────────────
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

// JST 00:00 を ISO 文字列で返す（Supabase の gte フィルタ用）
function jstMidnightIso(ts: number): string {
  return new Date(`${jstDateString(ts)}T00:00:00+09:00`).toISOString();
}

// JST 翌 00:00（リセット時刻）の Unix ms
function jstNextMidnightMs(ts: number): number {
  return new Date(jstMidnightIso(ts)).getTime() + 24 * 60 * 60 * 1000;
}

async function countTodayRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const since = jstMidnightIso(Date.now());
  const { count } = await supabase
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

async function fetchFirstPostAt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("records")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return null;
  return new Date(data.created_at as string).getTime();
}

async function fetchStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  // 既存 RPC（supabase/migrations/0003_streak.sql・JST 固定）
  const { data } = await supabase.rpc("get_streak");
  return typeof data === "number" ? data : 0;
}

async function fetchTotalDurationMs(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  // 全件 SUM（supabase/migrations/0006_records_duration.sql）。ページングを跨ぐ集計。
  const { data } = await supabase.rpc("get_total_duration_ms");
  const n = typeof data === "number" ? data : Number(data);
  return Number.isFinite(n) ? n : 0;
}

interface CreateBody {
  text?: unknown;
  durationMs?: unknown;
}

interface RecordRow {
  id: string;
  user_id: string;
  text: string;
  char_count: number;
  duration_ms: number | null;
  created_at: string;
  marked: boolean | null;
}

function parseIntParam(raw: string | null, fallback: number, max: number, min = 0): number {
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(n, max);
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── ?limit=&offset= でページング ──
  const url = request.nextUrl;
  const limit = parseIntParam(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, 1);
  const offset = parseIntParam(url.searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER, 0);
  const isFirstPage = offset === 0;

  // 1ページ目だけ totalCount を exact で取る（高価なので 2 ページ目以降は estimated）。
  // count: 'exact' を毎回打つと O(N) コストなので分岐。
  const countMode = isFirstPage ? "exact" : "estimated";

  const { data, count, error } = await supabase
    .from("records")
    .select("id, user_id, text, char_count, duration_ms, created_at, marked", { count: countMode, head: false })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("GET /api/records:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? (data?.length ?? 0);
  const posts: Post[] = (data as RecordRow[] ?? []).map((row, i) => ({
    id: row.id,
    user_id: row.user_id,
    text: row.text,
    char_count: row.char_count,
    durationMs: row.duration_ms ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    // newest post has highest index。offset を考慮。
    index: total - offset - i,
    marked: row.marked ?? false,
  }));

  const hasMore = posts.length === limit && offset + limit < total;
  const nextOffset = hasMore ? offset + limit : null;

  // 1 ページ目だけ stats を返す。続きページは posts と nextOffset のみで軽量化。
  if (!isFirstPage) {
    return NextResponse.json({ posts, nextOffset, hasMore });
  }

  // ── 集計（1 ページ目のみ）── 並列化
  const [todayCount, firstPostAt, streak, totalDurationMs] = await Promise.all([
    countTodayRecords(supabase, user.id),
    fetchFirstPostAt(supabase, user.id),
    fetchStreak(supabase),
    fetchTotalDurationMs(supabase),
  ]);

  return NextResponse.json({
    posts,
    nextOffset,
    hasMore,
    totalCount: total,
    streak,
    firstPostAt,
    totalDurationMs,
    todayCount,
    maxDaily: MAX_DAILY_SESSIONS,
    resetAt: jstNextMidnightMs(Date.now()),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  // 録音時間。不正値は 0、上限は MAX_RECORD_MS で clamp（クライアントを信頼しない）。
  const durationMs =
    typeof body.durationMs === "number" && Number.isFinite(body.durationMs) && body.durationMs >= 0
      ? Math.min(Math.round(body.durationMs), MAX_RECORD_MS)
      : 0;

  // ── 1日上限チェック（サーバ側 = 複数端末で同期する信頼源）──
  const todayBefore = await countTodayRecords(supabase, user.id);
  if (todayBefore >= MAX_DAILY_SESSIONS) {
    return NextResponse.json(
      {
        error: "daily_limit",
        todayCount: todayBefore,
        maxDaily: MAX_DAILY_SESSIONS,
        resetAt: jstNextMidnightMs(Date.now()),
      },
      { status: 429 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("records")
    .insert({ user_id: user.id, text, char_count: text.length, duration_ms: durationMs })
    .select("id, user_id, text, char_count, duration_ms, created_at, marked")
    .single();

  if (insertError || !inserted) {
    console.error("POST /api/records:", insertError);
    return NextResponse.json(
      { error: insertError?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  // index = total post count after insert。streak は STATS 同期用にサーバ集計を返す。
  const [{ count }, streak] = await Promise.all([
    supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    fetchStreak(supabase),
  ]);

  const row = inserted as RecordRow;
  const post: Post = {
    id: row.id,
    user_id: row.user_id,
    text: row.text,
    char_count: row.char_count,
    durationMs: row.duration_ms ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    index: count ?? 1,
    marked: row.marked ?? false,
  };

  return NextResponse.json(
    {
      post,
      streak,
      todayCount: todayBefore + 1,
      maxDaily: MAX_DAILY_SESSIONS,
      resetAt: jstNextMidnightMs(Date.now()),
    },
    { status: 201 },
  );
}
