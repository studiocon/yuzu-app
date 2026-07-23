import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { getOldestReportPeriodKey, getReport, listReportKeys } from "@/lib/reports";
import { getEntitlements } from "@/lib/entitlements";
import { isReportPeriodAccessible } from "@/lib/reportAccess";
import {
  parsePeriodKey,
  periodLabel,
  recentClosedPeriods,
  type PeriodMeta,
} from "@/lib/period";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockRequest } from "@/lib/mockFixtures";

export const runtime = "nodejs";

// GET /api/reports?scope=recent (default) | all
export async function GET(req: NextRequest) {
  const { supabase, user } = await getAuthedClient(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized", reports: [] }, { status: 401 });
  }

  // 管理者限定モックモード（ストア用スクショ）。
  if (await isMockRequest(req, supabase, user.id)) {
    return NextResponse.json({ reports: buildMockReportMetas() });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "recent";

  try {
    // ユーザーの投稿を全件取得（期間フィルタ用）
    // 読み取りエラーを「投稿ゼロ」と混同しない。ここを握り潰すと postTimes が
    // 全期間で 0 件になり、filter(m => m.generated || m.postCount > 0) が
    // 未生成期間を全て弾いて `{ reports: [] }` を 200 で返してしまう（#140）。
    const { data: rows, error: recordsError } = await supabase
      .from("records")
      .select("id, created_at")
      .eq("user_id", user.id);
    if (recordsError) throw new Error(`records fetch failed: ${recordsError.message}`);

    const postTimes = (rows ?? []).map((r: { created_at: string }) =>
      new Date(r.created_at).getTime()
    );

    const [savedKeys, ent] = await Promise.all([
      listReportKeys(user.id),
      getEntitlements(supabase, user.id, req),
    ]);
    // Free teaser ゲート用。oldestPeriodKey は canUseAllReports なユーザーには不要なので
    // 余計な問い合わせをしない（billing 無効時は常にここを通らない）。
    const oldestPeriodKey = ent.canUseAllReports ? null : await getOldestReportPeriodKey(user.id);

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
          // 詳細遷移時の即時描画のためフル payload も載せる
          payload: cached?.payload,
          generatedAt: cached?.generatedAt,
          model: cached?.model,
        };
      }),
    );

    const filtered = metas
      .filter((m) => m.generated || m.postCount > 0)
      .map((m): ReportMeta => {
        const locked = !isReportPeriodAccessible({
          canUseAllReports: ent.canUseAllReports,
          periodKey: m.periodKey,
          oldestPeriodKey,
        });
        if (!locked) return { ...m, locked };
        // ロック中は内容（見出し・トピック・本文）を剥がしメタデータのみ返す。
        // 一覧レスポンスから teaser 対象外の内容が読めてしまわないようにする。
        return {
          periodKey: m.periodKey,
          kind: m.kind,
          rangeStart: m.rangeStart,
          rangeEnd: m.rangeEnd,
          label: m.label,
          generated: m.generated,
          postCount: m.postCount,
          generatedAt: m.generatedAt,
          model: m.model,
          locked: true,
        };
      });
    return NextResponse.json({ reports: filtered });
  } catch (e) {
    console.error("listReports failed", e);
    return NextResponse.json({ error: "internal_error", reports: [] }, { status: 500 });
  }
}
