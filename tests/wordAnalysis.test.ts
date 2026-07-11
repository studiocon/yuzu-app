import { describe, it, expect } from "vitest";
import { extractWordFrequencies } from "../lib/wordAnalysis";

// WORDS（INSIGHT の頻出語 TOP20）は実データ 53 投稿の検証で
// 「ー」「ちゃん」「方」等の junk が上位に混入することが分かった。
// ここではその修正ルール（長音のみ除外・純ひらがな 1〜3 文字除外・
// 汎用単漢字ブロックリスト・ストップワード追加）を固定する。

describe("extractWordFrequencies", () => {
  it("空配列入力は空配列を返す", () => {
    expect(extractWordFrequencies([])).toEqual([]);
  });

  it("長音・波線のみのトークンを除外する", () => {
    const words = extractWordFrequencies(["ー", "ーーー", "〜"]);
    expect(words.find((w) => w.word === "ー")).toBeUndefined();
    expect(words.find((w) => w.word === "ーーー")).toBeUndefined();
    expect(words.find((w) => w.word === "〜")).toBeUndefined();
  });

  it("3文字までの純ひらがなトークン（機能語）を除外する", () => {
    const words = extractWordFrequencies([
      "花子ちゃんと話した",
      "行きたいんだけど時間がない",
      "歩きながら考えた",
      "これぐらいでいい",
    ]);
    expect(words.find((w) => w.word === "ちゃん")).toBeUndefined();
    expect(words.find((w) => w.word === "だけど")).toBeUndefined();
    expect(words.find((w) => w.word === "ながら")).toBeUndefined();
    expect(words.find((w) => w.word === "ぐらい")).toBeUndefined();
  });

  it("汎用単漢字（形式名詞・助数詞）を除外する", () => {
    const words = extractWordFrequencies([
      "彼の方が良い",
      "何か食べたい",
      "その的を絞る",
    ]);
    expect(words.find((w) => w.word === "方")).toBeUndefined();
    expect(words.find((w) => w.word === "何")).toBeUndefined();
    expect(words.find((w) => w.word === "的")).toBeUndefined();
  });

  it("意味のある単漢字はブロックリストに無いので残る", () => {
    const words = extractWordFrequencies(["夏がもう終わる", "声を録音する"]);
    expect(words.find((w) => w.word === "夏")).toBeDefined();
    expect(words.find((w) => w.word === "声")).toBeDefined();
  });

  it("内容語（カタカナ語・熟語）は残り count が正しく集計される", () => {
    const words = extractWordFrequencies([
      "デザインの転職についてメンターと話した",
      "デザインの転職はうまくいった",
      "デザインが好きだ",
    ]);
    const designWord = words.find((w) => w.word === "デザイン");
    const careerChangeWord = words.find((w) => w.word === "転職");
    const mentorWord = words.find((w) => w.word === "メンター");
    expect(designWord?.count).toBe(3);
    expect(careerChangeWord?.count).toBe(2);
    expect(mentorWord?.count).toBe(1);
  });

  it("追加ストップワード（いろいろ・ちゃんと・できる等）を除外する", () => {
    // TinySegmenter は文脈次第でトークン分割が変わるため、単語単体を text として
    // 渡し「そのまま1トークンになる」ケースで STOPWORDS 追加分を固定する。
    const words = extractWordFrequencies([
      "いろいろ",
      "ちゃんと",
      "できる",
      "けれども",
      "そういう",
      "こういう",
      "どういう",
    ]);
    expect(words).toEqual([]);
  });
});
