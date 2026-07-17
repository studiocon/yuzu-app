import { describe, it, expect } from "vitest";
import { parseScore, splitCachedPosts } from "../lib/sentimentScore";

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

describe("splitCachedPosts", () => {
  it("キャッシュ済み id を cached、それ以外を uncached に振り分ける", () => {
    const posts = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const { cached, uncached } = splitCachedPosts(posts, new Set(["b"]));
    expect(cached).toEqual([{ id: "b" }]);
    expect(uncached).toEqual([{ id: "a" }, { id: "c" }]);
  });
  it("配列でも Set と同じ結果になる", () => {
    const posts = [{ id: "a" }, { id: "b" }];
    const { cached, uncached } = splitCachedPosts(posts, ["a"]);
    expect(cached).toEqual([{ id: "a" }]);
    expect(uncached).toEqual([{ id: "b" }]);
  });
  it("キャッシュが空なら全件 uncached", () => {
    const posts = [{ id: "a" }, { id: "b" }];
    const { cached, uncached } = splitCachedPosts(posts, []);
    expect(cached).toEqual([]);
    expect(uncached).toEqual(posts);
  });
  it("全件キャッシュ済みなら uncached は空", () => {
    const posts = [{ id: "a" }, { id: "b" }];
    const { cached, uncached } = splitCachedPosts(posts, ["a", "b"]);
    expect(cached).toEqual(posts);
    expect(uncached).toEqual([]);
  });
});
