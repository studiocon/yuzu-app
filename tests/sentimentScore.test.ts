import { describe, it, expect } from "vitest";
import { parseScore } from "../lib/sentimentScore";

describe("parseScore", () => {
  it("JSON の {\"score\": N} を読む", () => {
    expect(parseScore('{"score": 0.5}')).toBe(0.5);
    expect(parseScore('前置き {"score":-0.3} 後置き')).toBe(-0.3);
  });
  it("波括弧が無くても \"score\": N を読む", () => {
    expect(parseScore('"score": 0.7')).toBe(0.7);
  });
  it("応答全体が数値だけなら読む", () => {
    expect(parseScore("0.5")).toBe(0.5);
    expect(parseScore("  -0.2 ")).toBe(-0.2);
  });
  it("[-1,1] に clamp する", () => {
    expect(parseScore('{"score": 2}')).toBe(1);
    expect(parseScore('{"score": -5}')).toBe(-1);
  });
  it("#146: 本文中の無関係な数字は拾わず throw する", () => {
    expect(() => parseScore("10段階中5です")).toThrow();
    expect(() => parseScore("スコアは中くらい")).toThrow();
    expect(() => parseScore("the score is 5 out of 10")).toThrow();
  });
});
