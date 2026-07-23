import { describe, it, expect, afterEach } from "vitest";
import { billingEnabled, resolveEntitlements } from "../lib/entitlements";
import {
  MAX_DAILY_SESSIONS,
  MAX_RECORD_MS,
  PLUS_MAX_DAILY_SESSIONS,
  PLUS_MAX_RECORD_MS,
} from "../lib/constants";

const ORIGINAL_BILLING_ENABLED = process.env.BILLING_ENABLED;

afterEach(() => {
  // 他テストファイルへ env の変更を漏らさない。
  if (ORIGINAL_BILLING_ENABLED === undefined) {
    delete process.env.BILLING_ENABLED;
  } else {
    process.env.BILLING_ENABLED = ORIGINAL_BILLING_ENABLED;
  }
});

describe("billingEnabled", () => {
  it("未設定は false（既定 off）", () => {
    delete process.env.BILLING_ENABLED;
    expect(billingEnabled()).toBe(false);
  });

  it("'1' の時のみ true", () => {
    process.env.BILLING_ENABLED = "1";
    expect(billingEnabled()).toBe(true);
  });

  it("'1' 以外の文字列（'true' 等）は false", () => {
    process.env.BILLING_ENABLED = "true";
    expect(billingEnabled()).toBe(false);
  });
});

// resolveEntitlements は純粋関数。admin/user 分岐、plan 別上限、billing フラグによる
// canUseThemes/canUseAllReports ゲートの全マトリクスを固定する。
describe("resolveEntitlements", () => {
  it("admin は plan・billing に関わらず premium + 無制限 + 全機能利用可", () => {
    delete process.env.BILLING_ENABLED;
    const ent = resolveEntitlements("free", "admin");
    expect(ent).toEqual({
      plan: "premium",
      role: "admin",
      isAdmin: true,
      maxDailySessions: null,
      maxRecordMs: null,
      canUseThemes: true,
      canUseAllReports: true,
    });
  });

  it("admin は billingEnabled=true でも常にゲートされない", () => {
    process.env.BILLING_ENABLED = "1";
    const ent = resolveEntitlements("free", "admin");
    expect(ent.canUseThemes).toBe(true);
    expect(ent.canUseAllReports).toBe(true);
    expect(ent.maxDailySessions).toBeNull();
    expect(ent.maxRecordMs).toBeNull();
  });

  describe("上限（billingEnabled に関わらず plan に応じて即時反映）", () => {
    it("user(free) は無料上限（MAX_DAILY_SESSIONS / MAX_RECORD_MS）", () => {
      delete process.env.BILLING_ENABLED;
      const ent = resolveEntitlements("free", "user");
      expect(ent.plan).toBe("free");
      expect(ent.isAdmin).toBe(false);
      expect(ent.maxDailySessions).toBe(MAX_DAILY_SESSIONS);
      expect(ent.maxRecordMs).toBe(MAX_RECORD_MS);
    });

    it("user(light) は PLUS 上限（PLUS_MAX_DAILY_SESSIONS / PLUS_MAX_RECORD_MS）", () => {
      delete process.env.BILLING_ENABLED;
      const ent = resolveEntitlements("light", "user");
      expect(ent.plan).toBe("light");
      expect(ent.isAdmin).toBe(false);
      expect(ent.maxDailySessions).toBe(PLUS_MAX_DAILY_SESSIONS);
      expect(ent.maxRecordMs).toBe(PLUS_MAX_RECORD_MS);
    });

    it("user(premium) は PLUS 上限（PLUS_MAX_DAILY_SESSIONS / PLUS_MAX_RECORD_MS）", () => {
      delete process.env.BILLING_ENABLED;
      const ent = resolveEntitlements("premium", "user");
      expect(ent.plan).toBe("premium");
      expect(ent.isAdmin).toBe(false);
      expect(ent.maxDailySessions).toBe(PLUS_MAX_DAILY_SESSIONS);
      expect(ent.maxRecordMs).toBe(PLUS_MAX_RECORD_MS);
    });

    it("billingEnabled=true でも上限の plan 別反映は変わらない", () => {
      process.env.BILLING_ENABLED = "1";
      expect(resolveEntitlements("free", "user").maxDailySessions).toBe(MAX_DAILY_SESSIONS);
      expect(resolveEntitlements("premium", "user").maxDailySessions).toBe(PLUS_MAX_DAILY_SESSIONS);
    });
  });

  describe("canUseThemes / canUseAllReports（billing フラグ × plan のゲート）", () => {
    it("billingEnabled=false（既定）: free/light/premium 全て true（現状維持・無回帰）", () => {
      delete process.env.BILLING_ENABLED;
      for (const plan of ["free", "light", "premium"] as const) {
        const ent = resolveEntitlements(plan, "user");
        expect(ent.canUseThemes).toBe(true);
        expect(ent.canUseAllReports).toBe(true);
      }
    });

    it("billingEnabled=true: free のみ false、light/premium は true", () => {
      process.env.BILLING_ENABLED = "1";
      const free = resolveEntitlements("free", "user");
      expect(free.canUseThemes).toBe(false);
      expect(free.canUseAllReports).toBe(false);

      const light = resolveEntitlements("light", "user");
      expect(light.canUseThemes).toBe(true);
      expect(light.canUseAllReports).toBe(true);

      const premium = resolveEntitlements("premium", "user");
      expect(premium.canUseThemes).toBe(true);
      expect(premium.canUseAllReports).toBe(true);
    });
  });

  it("simulate 意味論：admin が特定プランを模擬する呼び出しは (simPlan, \"user\") と等価", () => {
    delete process.env.BILLING_ENABLED;
    const a = resolveEntitlements("light", "user");
    const b = resolveEntitlements("light", "user");
    expect(a).toEqual(b);
    // simulate 時は role=user 扱いになる（isAdmin は立たない）
    expect(a.isAdmin).toBe(false);
    expect(a.plan).toBe("light");
    expect(a.maxDailySessions).toBe(PLUS_MAX_DAILY_SESSIONS);
  });
});
