import { describe, it, expect } from "vitest";
import {
  buildMockPosts,
  buildMockReport,
  buildMockReportMetas,
  buildMockSentimentResults,
  MOCK_TRANSCRIBE_TEXT,
} from "../lib/mockFixtures";

// 管理者限定モックモードのフィクスチャは「決定的」であることが要件（スクショの再現性）。
// ここでは呼び出しごとに同じ件数・同じ id・スコア範囲であることを固定する。
describe("buildMockPosts", () => {
  it("常に同じ件数を返す", () => {
    const a = buildMockPosts("user-1");
    const b = buildMockPosts("user-1");
    expect(a.length).toBe(b.length);
    expect(a.length).toBeGreaterThan(0);
  });

  it("id が呼び出しをまたいで安定している", () => {
    const a = buildMockPosts("user-1").map((p) => p.id).sort();
    const b = buildMockPosts("user-1").map((p) => p.id).sort();
    expect(a).toEqual(b);
  });

  it("index は 1..件数 のユニークな連番", () => {
    const posts = buildMockPosts("user-1");
    const indexes = posts.map((p) => p.index).sort((x, y) => x - y);
    expect(indexes).toEqual(Array.from({ length: posts.length }, (_, i) => i + 1));
  });

  it("user_id を渡した値で埋める", () => {
    const posts = buildMockPosts("user-42");
    expect(posts.every((p) => p.user_id === "user-42")).toBe(true);
  });
});

describe("buildMockSentimentResults", () => {
  it("すべての SEED id にスコアを返す（[-1, 1] の範囲内）", () => {
    const posts = buildMockPosts("user-1").map((p) => ({ id: p.id }));
    const { results } = buildMockSentimentResults(posts);
    expect(results.length).toBe(posts.length);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(typeof r.date).toBe("string");
    }
  });

  it("未知の id にも決定的なスコアを返す", () => {
    const a = buildMockSentimentResults([{ id: "unknown-abc" }]);
    const b = buildMockSentimentResults([{ id: "unknown-abc" }]);
    expect(a.results[0].score).toBe(b.results[0].score);
    expect(a.results[0].score).toBeGreaterThanOrEqual(-1);
    expect(a.results[0].score).toBeLessThanOrEqual(1);
  });
});

describe("buildMockReportMetas", () => {
  it("直近の確定済み期間ぶんのメタを返し、headline/topics が非空", () => {
    const metas = buildMockReportMetas();
    expect(metas.length).toBeGreaterThan(0);
    for (const m of metas) {
      expect(m.headline).toBeTruthy();
      expect(m.topics && m.topics.length).toBeGreaterThan(0);
    }
  });
});

describe("buildMockReport", () => {
  it("先頭 meta の periodKey で全フィールド非空のレポートを返す", () => {
    const metas = buildMockReportMetas();
    const report = buildMockReport(metas[0].periodKey);
    expect(report).not.toBeNull();
    expect(report!.payload.headline).toBeTruthy();
    expect(report!.payload.fact).toBeTruthy();
    expect(report!.payload.proof).toBeTruthy();
    expect(report!.payload.shadow).toBeTruthy();
    expect(report!.payload.advice).toBeTruthy();
    expect(report!.payload.adviceDetail).toBeTruthy();
    expect(report!.payload.sentimentSeries.length).toBeGreaterThan(0);
  });

  it("不正な periodKey は null を返す", () => {
    expect(buildMockReport("not-a-period-key")).toBeNull();
  });
});

describe("MOCK_TRANSCRIBE_TEXT", () => {
  it("非空の文字列", () => {
    expect(MOCK_TRANSCRIBE_TEXT.length).toBeGreaterThan(0);
  });
});
