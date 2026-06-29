import { describe, it, expect } from "vitest";
import { recordWords, splitHighlights } from "../lib/highlightWords";

// 本文ハイライトは「内容語だけ mark=true・助詞等は素通り」が正。
// マッチ結果を連結すると必ず原文に戻る（取りこぼし/重複なし）こと、
// 重なり語は長い語が勝つことを固定する。
const join = (segs: { text: string }[]) => segs.map((s) => s.text).join("");

describe("recordWords", () => {
  it("内容語（名詞・カタカナ語）を拾い、助詞は拾わない", () => {
    const words = recordWords("仕事のプレッシャーが本当にきつい");
    expect(words.has("仕事")).toBe(true);
    expect(words.has("プレッシャー")).toBe(true);
    expect(words.has("の")).toBe(false);
    expect(words.has("が")).toBe(false);
  });

  it("空文字は空集合", () => {
    expect(recordWords("").size).toBe(0);
  });

  it("単漢字・純ひらがなの機能語はノイズとして落とす", () => {
    const words = recordWords("それだけで一日として成立する気がする");
    // 「成立」は漢字2字＝内容語として残る
    expect(words.has("成立")).toBe(true);
    // 「として」純ひらがな・「一」「日」単漢字はハイライトしない
    expect(words.has("として")).toBe(false);
    expect(words.has("一")).toBe(false);
    expect(words.has("日")).toBe(false);
  });
});

describe("splitHighlights", () => {
  it("内容語を mark=true で分割し、間の助詞は mark=false のまま", () => {
    const text = "仕事のプレッシャー";
    const words = new Set(["仕事", "プレッシャー"]);
    const segs = splitHighlights(text, words);
    expect(join(segs)).toBe(text);
    expect(segs.filter((s) => s.mark).map((s) => s.text)).toEqual(["仕事", "プレッシャー"]);
    expect(segs.find((s) => s.text === "の")?.mark).toBe(false);
  });

  it("語彙が空なら全体を mark=false の 1 セグメントで返す", () => {
    const segs = splitHighlights("なにもない", new Set());
    expect(segs).toEqual([{ text: "なにもない", mark: false }]);
  });

  it("重なる語は長い方を優先する", () => {
    const text = "自己肯定感が低い";
    const words = new Set(["肯定", "自己肯定感"]);
    const segs = splitHighlights(text, words);
    expect(join(segs)).toBe(text);
    const marked = segs.filter((s) => s.mark).map((s) => s.text);
    expect(marked).toContain("自己肯定感");
    expect(marked).not.toContain("肯定");
  });

  it("正規表現特殊文字を含む語でも壊れない", () => {
    const text = "C++が好き";
    const words = new Set(["C++"]);
    const segs = splitHighlights(text, words);
    expect(join(segs)).toBe(text);
    expect(segs.some((s) => s.mark && s.text === "C++")).toBe(true);
  });

  it("空文字は空配列", () => {
    expect(splitHighlights("", new Set(["x"]))).toEqual([]);
  });
});
