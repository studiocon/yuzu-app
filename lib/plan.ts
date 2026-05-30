import type { SupabaseClient } from "@supabase/supabase-js";

// プランロール（#102）。Free / Light / Premium の 3 段。
// 書き込みは service_role のみ（RevenueCat webhook / admin）。クライアントは表示のみ。
export type Plan = "free" | "light" | "premium";
export type PlanPeriod = "monthly" | "annual";

export const PLANS: Plan[] = ["free", "light", "premium"];
export const DEFAULT_PLAN: Plan = "free";

export function isPaidPlan(plan: Plan): boolean {
  return plan === "light" || plan === "premium";
}

// 表示ラベル（settings 等）。価格は載せない（Notion 管理）。
export const PLAN_LABEL: Record<Plan, string> = {
  free: "フリープラン",
  light: "ライトプラン",
  premium: "プレミアムプラン",
};

// サーバ専用ヘルパ：認証済みユーザーの現在プランを取得する。
// profiles.plan を読む（RLS で本人の行のみ）。不正値・未取得は free にフォールバック。
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<Plan> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle<{ plan: string }>();
  if (error) {
    console.error("getUserPlan:", error);
    return DEFAULT_PLAN;
  }
  const p = data?.plan;
  return p === "light" || p === "premium" ? p : DEFAULT_PLAN;
}
