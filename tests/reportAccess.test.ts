import { describe, it, expect } from "vitest";
import { isReportPeriodAccessible } from "../lib/reportAccess";

// レポート teaser ゲートの純粋ロジック。DB 非依存（getOldestReportPeriodKey の結果を
// 引数として受け取るだけ）なのでここで全分岐を固定する。
describe("isReportPeriodAccessible", () => {
  it("canUseAllReports=true なら常に true（PLUS / admin / billing off）", () => {
    expect(
      isReportPeriodAccessible({
        canUseAllReports: true,
        periodKey: "w-2026-07-06",
        oldestPeriodKey: "m-2026-05",
      }),
    ).toBe(true);
    expect(
      isReportPeriodAccessible({
        canUseAllReports: true,
        periodKey: "w-2026-07-06",
        oldestPeriodKey: null,
      }),
    ).toBe(true);
  });

  it("oldestPeriodKey が null（初回生成前）なら teaser 対象が未確定なので true", () => {
    expect(
      isReportPeriodAccessible({
        canUseAllReports: false,
        periodKey: "w-2026-07-06",
        oldestPeriodKey: null,
      }),
    ).toBe(true);
  });

  it("free ゲート下では oldestPeriodKey と一致する期間のみ true", () => {
    const oldest = "m-2026-05";
    expect(
      isReportPeriodAccessible({ canUseAllReports: false, periodKey: oldest, oldestPeriodKey: oldest }),
    ).toBe(true);
  });

  it("free ゲート下では oldestPeriodKey 以外は false", () => {
    const oldest = "m-2026-05";
    expect(
      isReportPeriodAccessible({
        canUseAllReports: false,
        periodKey: "w-2026-07-06",
        oldestPeriodKey: oldest,
      }),
    ).toBe(false);
  });
});
