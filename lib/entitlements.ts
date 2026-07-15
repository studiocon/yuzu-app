import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { DEFAULT_PLAN, PLANS, type Plan } from "./plan";
import { MAX_DAILY_SESSIONS, MAX_RECORD_MS } from "./constants";

// admin ロール（開発モード = 上限バイパス）。書き込みは service_role のみ。
export type Role = "user" | "admin";

export type Entitlements = {
  plan: Plan;
  role: Role;
  isAdmin: boolean;
  maxDailySessions: number | null; // null = 無制限
  maxRecordMs: number | null;      // null = 無制限（サーバは ABSOLUTE_MAX_RECORD_MS で clamp）
};

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
    };
  }
  return {
    plan,
    role: "user",
    isAdmin: false,
    maxDailySessions: MAX_DAILY_SESSIONS,
    maxRecordMs: MAX_RECORD_MS,
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
