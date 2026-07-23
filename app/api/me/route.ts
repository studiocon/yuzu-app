import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { billingEnabled, getEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 自分の role / plan / limits を返す。ネイティブアプリの admin メニュー表示判定用。
export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ent = await getEntitlements(supabase, user.id, request);

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    role: ent.role,
    plan: ent.plan,
    limits: {
      maxDailySessions: ent.maxDailySessions,
      maxRecordMs: ent.maxRecordMs,
    },
    // billing launch（#65 Phase B）前はネイティブ側の課金 UI を隠すためのフラグ。
    // billing=false の間は insightsPreview=true（PATTERN/全期間レポートを teaser 無しで見せてよい）。
    features: {
      billing: billingEnabled(),
      insightsPreview: !billingEnabled(),
    },
  });
}
