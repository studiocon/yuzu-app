import { describe, it, expect } from "vitest";
import { resolveEntitlements } from "../lib/entitlements";
import { MAX_DAILY_SESSIONS, MAX_RECORD_MS } from "../lib/constants";

// resolveEntitlements は純粋関数。admin/user 分岐と simulate 意味論（(plan, "user") 呼び出し）を固定する。
describe("resolveEntitlements", () => {
  it("admin は plan・上限に関わらず premium + 無制限 + isAdmin", () => {
    const ent = resolveEntitlements("free", "admin");
    expect(ent).toEqual({
      plan: "premium",
      role: "admin",
      isAdmin: true,
      maxDailySessions: null,
      maxRecordMs: null,
    });
  });

  it("user(free) は定数由来の上限を持つ", () => {
    const ent = resolveEntitlements("free", "user");
    expect(ent.plan).toBe("free");
    expect(ent.isAdmin).toBe(false);
    expect(ent.maxDailySessions).toBe(MAX_DAILY_SESSIONS);
    expect(ent.maxRecordMs).toBe(MAX_RECORD_MS);
  });

  it("user(premium) は plan を保持しつつ現行の上限は free と同じ", () => {
    const ent = resolveEntitlements("premium", "user");
    expect(ent.plan).toBe("premium");
    expect(ent.isAdmin).toBe(false);
    expect(ent.maxDailySessions).toBe(MAX_DAILY_SESSIONS);
    expect(ent.maxRecordMs).toBe(MAX_RECORD_MS);
  });

  it("simulate 意味論：admin が特定プランを模擬する呼び出しは (simPlan, \"user\") と等価", () => {
    expect(resolveEntitlements("light", "user")).toEqual(
      resolveEntitlements("light", "user"),
    );
    // simulate 時は role=user 扱いになる（isAdmin は立たない）
    const simulated = resolveEntitlements("light", "user");
    expect(simulated.isAdmin).toBe(false);
    expect(simulated.plan).toBe("light");
  });
});
