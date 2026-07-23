import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { DEFAULT_PLAN, PLANS, isPaidPlan, type Plan } from "./plan";
import { MAX_DAILY_SESSIONS, MAX_RECORD_MS, PLUS_MAX_DAILY_SESSIONS, PLUS_MAX_RECORD_MS } from "./constants";

// admin ロール（開発モード = 上限バイパス）。書き込みは service_role のみ。
export type Role = "user" | "admin";

export type Entitlements = {
  plan: Plan;
  role: Role;
  isAdmin: boolean;
  maxDailySessions: number | null; // null = 無制限
  maxRecordMs: number | null;      // null = 無制限（サーバは ABSOLUTE_MAX_RECORD_MS で clamp）
  canUseThemes: boolean;           // PATTERN（insights/themes）。false は「billing 有効 & free & 非 admin」の時のみ
  canUseAllReports: boolean;       // 全期間のレポート閲覧・生成。false は同上（teaser: 最初の1件だけ許可）
};

// #65 Phase B（billing 本launch）まで既定 off。Vercel 環境変数 BILLING_ENABLED="1" で有効化する。
// off の間は canUseThemes/canUseAllReports は plan に関わらず常に true（現状維持、無害）。
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "1";
}

const SIMULATE_HEADER = "x-yuzu-simulate-plan";

// 純粋関数。将来のプランゲート（Free/PLUS の回数・分数・レポート teaser 等）はここ 1 箇所に集約する。
export function resolveEntitlements(plan: Plan, role: Role): Entitlements {
  if (role === "admin") {
    return {
      plan: "premium",
      role: "admin",
      isAdmin: true,
      maxDailySessions: null,
      maxRecordMs: null,
      canUseThemes: true,
      canUseAllReports: true,
    };
  }
  // 回数・分数の上限は billingEnabled に関わらず plan に応じて即時反映する
  // （現在 light/premium ユーザーは存在しないため挙動は変わらない。service_role で plan を
  // 立てたテストアカウントから PLUS 上限を検証できる）。
  const paid = isPaidPlan(plan);
  // PATTERN・全期間レポートのゲートは billing launch までは常に無効（既存ユーザーへの回帰防止）。
  const gated = billingEnabled() && plan === "free";
  return {
    plan,
    role: "user",
    isAdmin: false,
    maxDailySessions: paid ? PLUS_MAX_DAILY_SESSIONS : MAX_DAILY_SESSIONS,
    maxRecordMs: paid ? PLUS_MAX_RECORD_MS : MAX_RECORD_MS,
    canUseThemes: !gated,
    canUseAllReports: !gated,
  };
}

// profiles から plan + role を 1 クエリで取得（RLS: 本人行のみ）。
// admin のみ X-Yuzu-Simulate-Plan: free|light|premium ヘッダで通常ユーザーのゲートを再現できる
// （指定時は role=user 扱いで resolve）。エラー時は free/user にフォールバック（console.error は出す）。
export async function getEntitlements(
  supabase: SupabaseClient,
  userId: string,
  req?: NextRequest,
): Promise<Entitlements> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, role")
    .eq("id", userId)
    .maybeSingle<{ plan: string; role: string }>();

  if (error) {
    console.error("getEntitlements:", error);
    return resolveEntitlements(DEFAULT_PLAN, "user");
  }

  const plan: Plan = PLANS.includes(data?.plan as Plan) ? (data!.plan as Plan) : DEFAULT_PLAN;
  const role: Role = data?.role === "admin" ? "admin" : "user";

  if (role === "admin" && req) {
    const sim = req.headers.get(SIMULATE_HEADER);
    if (PLANS.includes(sim as Plan)) {
      return resolveEntitlements(sim as Plan, "user");
    }
  }

  return resolveEntitlements(plan, role);
}

export async function getUserRole(supabase: SupabaseClient, userId: string): Promise<Role> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string }>();
  if (error) {
    console.error("getUserRole:", error);
    return "user";
  }
  return data?.role === "admin" ? "admin" : "user";
}
