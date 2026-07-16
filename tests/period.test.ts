import { describe, it, expect } from "vitest";
import {
  DAY_MS,
  jstDateString,
  jstHour,
  jstSundayStart,
  jstMonthStart,
  weekKey,
  monthKey,
  parsePeriodKey,
  previousPeriodKey,
  isClosed,
  formatPeriodRange,
  recentClosedPeriods,
} from "../lib/period";

// JST 固定の境界ロジックは過去に「ローカルタイムで日付を割る」混同で事故っている領域。
// UTC で構築した instant に対し JST(+9h) の見え方が正しいかを固定する。
const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
  Date.UTC(y, m - 1, d, h, min, 0);

describe("jstDateString", () => {
  it("UTC 14:59 はまだ前日 JST（23:59）", () => {
    expect(jstDateString(utc(2026, 6, 28, 14, 59))).toBe("2026-06-28");
  });
  it("UTC 15:00 で JST は翌 00:00 に繰り上がる", () => {
    expect(jstDateString(utc(2026, 6, 28, 15, 0))).toBe("2026-06-29");
  });
});

describe("jstHour", () => {
  it("UTC 15:30 は JST 00 時", () => {
    expect(jstHour(utc(2026, 6, 28, 15, 30))).toBe(0);
  });
  it("UTC 03:00 は JST 12 時", () => {
    expect(jstHour(utc(2026, 6, 29, 3, 0))).toBe(12);
  });
});

describe("jstSundayStart / jstMonthStart", () => {
  it("月曜(2026-06-29)を含む週の日曜始まりは 2026-06-28 00:00 JST", () => {
    const mondayNoon = utc(2026, 6, 29, 3, 0); // 12:00 JST 月曜
    // 2026-06-28 00:00 JST = 2026-06-27 15:00 UTC
    expect(jstSundayStart(mondayNoon)).toBe(utc(2026, 6, 28) - 9 * 3600 * 1000);
  });
  it("週始まりは常に ts 以前で 7 日以内", () => {
    const ts = utc(2026, 6, 29, 3, 0);
    const start = jstSundayStart(ts);
    expect(start).toBeLessThanOrEqual(ts);
    expect(ts - start).toBeLessThan(7 * DAY_MS);
  });
  it("月始まりは 2026-06-01 00:00 JST", () => {
    // 2026-06-01 00:00 JST = 2026-05-31 15:00 UTC
    expect(jstMonthStart(utc(2026, 6, 29, 3, 0))).toBe(utc(2026, 6, 1) - 9 * 3600 * 1000);
  });
});

describe("weekKey / monthKey と parsePeriodKey の往復", () => {
  it("weekKey を parse すると週境界に戻る", () => {
    const ts = utc(2026, 6, 29, 3, 0);
    const key = weekKey(ts);
    expect(key).toBe("w-2026-06-28");
    const p = parsePeriodKey(key)!;
    expect(p.kind).toBe("week");
    expect(p.start).toBe(jstSundayStart(ts));
    expect(p.end).toBe(p.start + 7 * DAY_MS);
  });
  it("monthKey を parse すると月境界に戻る（年跨ぎ）", () => {
    const dec = utc(2026, 12, 15, 3, 0);
    expect(monthKey(dec)).toBe("m-2026-12");
    const p = parsePeriodKey("m-2026-12")!;
    expect(p.start).toBe(jstMonthStart(dec));
    expect(p.end).toBe(Date.UTC(2027, 0, 1) - 9 * 3600 * 1000); // 2027-01-01 00:00 JST
  });
  it("不正なキーは null", () => {
    expect(parsePeriodKey("garbage")).toBeNull();
    expect(parsePeriodKey("w-2026-6-1")).toBeNull(); // 2桁ゼロ埋め必須
  });
  it("月/日が範囲外のキーは null（Date.UTC のロールオーバー防止）", () => {
    expect(parsePeriodKey("w-2026-99-99")).toBeNull();
    expect(parsePeriodKey("w-2026-00-15")).toBeNull();
    expect(parsePeriodKey("w-2026-06-32")).toBeNull();
    expect(parsePeriodKey("m-2026-13")).toBeNull();
    expect(parsePeriodKey("m-2026-00")).toBeNull();
  });
  it("#143: 日曜に整列していない週キーは null（非正規キーでの多重生成を防止）", () => {
    // 2026-06-28 は日曜（canonical）。前後は月曜/土曜で非正規。
    expect(parsePeriodKey("w-2026-06-28")).not.toBeNull();
    expect(parsePeriodKey("w-2026-06-29")).toBeNull(); // 月曜
    expect(parsePeriodKey("w-2026-06-27")).toBeNull(); // 土曜
    expect(previousPeriodKey("w-2026-06-29")).toBeNull();
  });
});

describe("previousPeriodKey", () => {
  it("week は7日前の週キーを返す", () => {
    expect(previousPeriodKey("w-2026-06-28")).toBe("w-2026-06-21");
  });
  it("month は前月のキーを返す", () => {
    expect(previousPeriodKey("m-2026-06")).toBe("m-2026-05");
  });
  it("month は年跨ぎでも前年12月を返す", () => {
    expect(previousPeriodKey("m-2026-01")).toBe("m-2025-12");
  });
  it("不正なキーは null", () => {
    expect(previousPeriodKey("garbage")).toBeNull();
    expect(previousPeriodKey("w-2026-99-99")).toBeNull();
    expect(previousPeriodKey("m-2026-13")).toBeNull();
  });
});

describe("isClosed", () => {
  it("終了済み期間は closed", () => {
    expect(isClosed("m-2020-01", utc(2026, 6, 29))).toBe(true);
  });
  it("未来の期間は not closed", () => {
    expect(isClosed("m-2099-01", utc(2026, 6, 29))).toBe(false);
  });
});

describe("formatPeriodRange", () => {
  it("month はM月", () => {
    const p = parsePeriodKey("m-2026-06")!;
    expect(formatPeriodRange(p.start, p.end, "month")).toBe("6月");
  });
  it("week は M/D–M/D（end は排他境界なので最終日は end-1日）", () => {
    const p = parsePeriodKey("w-2026-06-28")!;
    expect(formatPeriodRange(p.start, p.end, "week")).toBe("6/28–7/4");
  });
});

describe("recentClosedPeriods", () => {
  it("全ての期間が now 以前に終了し end 降順", () => {
    const now = utc(2026, 6, 29, 3, 0);
    const list = recentClosedPeriods(now);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.end).toBeLessThanOrEqual(now);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].end).toBeGreaterThanOrEqual(list[i].end);
    }
  });
});
