import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReport, listReportKeys } from "@/lib/reports";
import {
  parsePeriodKey,
  periodLabel,
  recentClosedPeriods,
  type PeriodMeta,
} from "@/lib/period";
import type { ReportMeta } from "@/lib/reportTypes";

export const runtime = "nodejs";

// GET /api/reports?scope=recent (default) | all
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized", reports: [] }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "recent";

  try {
    // ユーザーの投稿を全件取得（期間フィルタ用）
    const { data: rows } = await supabase
      .from("records")
      .select("id, created_at")
      .eq("user_id", user.id);

    const postTimes = (rows ?? []).map((r: { created_at: string }) =>
      new Date(r.created_at).getTime()
    );

    const [savedKeys] = await Promise.all([listReportKeys(user.id)]);

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
        const cached = await getReport(user.id, c.key);
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
        };
      }),
    );

    const filtered = metas.filter((m) => m.generated || m.postCount > 0);
    return NextResponse.json({ reports: filtered });
  } catch (e) {
    console.error("listReports failed", e);
    return NextResponse.json({ error: "internal_error", reports: [] }, { status: 500 });
  }
}
