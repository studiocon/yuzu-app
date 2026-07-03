import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcpAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

interface RecordRow {
  id: string;
  text: string;
  duration_ms: number | null;
  created_at: string;
  marked: boolean | null;
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function parseIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// GET /api/mcp/records?limit=&since=&until=
// MCP サーバー専用の読み取り専用エンドポイント。Bearer トークン（パーソナルアクセストークン）認証のみ。
export async function GET(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const limit = parseLimit(url.searchParams.get("limit"));
  const since = parseIsoDate(url.searchParams.get("since"));
  const until = parseIsoDate(url.searchParams.get("until"));

  const admin = createAdminClient();
  let query = admin
    .from("records")
    .select("id, text, duration_ms, created_at, marked")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) query = query.gte("created_at", since);
  if (until) query = query.lt("created_at", until);

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/mcp/records:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const records = (data as RecordRow[] ?? []).map((row) => ({
    id: row.id,
    text: row.text,
    durationMs: row.duration_ms ?? 0,
    createdAt: row.created_at,
    marked: row.marked ?? false,
  }));

  return NextResponse.json({ records, count: records.length });
}
