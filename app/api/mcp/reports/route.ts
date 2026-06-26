import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcpAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReport, listReportKeys } from "@/lib/reports";
import {
  parsePeriodKey,
  periodLabel,
  recentClosedPeriods,
  type PeriodMeta,
} from "@/lib/period";
import type { ReportMeta } from "@/lib/reportTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mcp/reports?scope=recent (default) | all
// MCP サーバー専用の読み取り専用エンドポイント。Bearer トークン認証のみ。
// /api/reports と同じ組み立てロジックだが、Cookie セッションを持たない MCP サーバーから
// 呼ばれるため admin client + 明示 user_id フィルタで動く（認証境界が異なるため意図的に分離）。
export async function GET(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "recent";

  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("records")
      .select("created_at")
      .eq("user_id", auth.userId);

    const postTimes = (rows ?? []).map((r: { created_at: string }) =>
      new Date(r.created_at).getTime()
    );

    const savedKeys = await listReportKeys(auth.userId);

    let candidates: PeriodMeta[];
    if (scope === "recent") {
      candidates = recentClosedPeriods();
    } else {
      const recent = recentClosedPeriods(Date.now(), 12);
      const saved: PeriodMeta[] = savedKeys
        .map((key) => {
          const p = parsePeriodKey(key);
          if (!p) return null;
          return { key, kind: p.kind, start: p.start, end: p.end, label: periodLabel(key) };
        })
        .filter((x): x is PeriodMeta => x !== null);
      const map = new Map<string, PeriodMeta>();
      for (const m of [...recent, ...saved]) map.set(m.key, m);
      candidates = [...map.values()].sort((a, b) => b.end - a.end);
    }

    const metas: ReportMeta[] = await Promise.all(
      candidates.map(async (c): Promise<ReportMeta> => {
        const cached = await getReport(auth.userId, c.key);
        const postCount = postTimes.filter(
          (t) => t >= c.start && t < c.end,
        ).length;
        return {
          periodKey: c.key,
          kind: c.kind,
          rangeStart: c.start,
          rangeEnd: c.end,
          label: c.label,
          generated: !!cached,
          headline: cached?.payload.headline,
          topics: cached?.payload.topics,
          postCount,
          payload: cached?.payload,
          generatedAt: cached?.generatedAt,
          model: cached?.model,
        };
      }),
    );

    const filtered = metas.filter((m) => m.generated || m.postCount > 0);
    return NextResponse.json({ reports: filtered });
  } catch (e) {
    console.error("GET /api/mcp/reports:", e);
    return NextResponse.json({ error: "internal_error", reports: [] }, { status: 500 });
  }
}
