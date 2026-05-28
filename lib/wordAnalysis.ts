// TinySegmenter は ~25KB の純JSなのでクライアント側でも使う（mock mode 対応のため）。
// @ts-expect-error tiny-segmenter has no type definitions
import TinySegmenter from "tiny-segmenter";

const STOPWORDS = new Set<string>([
  // 助詞
  "の", "は", "が", "を", "に", "と", "で", "へ", "や", "も", "から", "まで", "より", "か",
  "ね", "よ", "わ", "ぞ", "ぜ", "さ", "な", "なあ",
  // 助動詞・接続
  "た", "て", "い", "る", "だ", "です", "ます", "でしょう", "だろう", "でした", "ました",
  "そう", "らしい", "ようだ", "みたい", "って", "という", "といった",
  // 形式名詞・指示語・汎用
  "こと", "もの", "ところ", "とき", "ため", "それ", "これ", "あれ", "どれ",
  "ここ", "そこ", "あそこ", "どこ", "この", "その", "あの", "どの",
  "ある", "いる", "する", "なる", "ない", "やる", "いく", "くる", "みる",
  // 副詞・フィラー
  "ちょっと", "なんか", "やっぱ", "やっぱり", "あと", "もう", "まだ", "ずっと",
  "とても", "すごく", "本当", "ほんと", "結構", "全然",
  "そして", "でも", "けど", "だから", "じゃあ", "では",
  // 内省ジャーナル頻出汎用
  "人", "自分", "今日", "今", "気", "感じ", "話", "言葉",
  "思う", "言う", "感じる",
  // 記号・空文字
  " ", "　", "、", "。", "！", "？", "「", "」", "（", "）", ".", ",", "!", "?",
]);

// 2 文字以下の純ひらがなトークンは助詞・活用語尾の断片であることが大半なので一律除外。
// 内容語（名詞・動詞語幹）はほぼ漢字・カタカナを含むので signal が改善する。
const HIRAGANA_SHORT = /^[\p{Script=Hiragana}ー]{1,2}$/u;
const KATAKANA_ONE_CHAR = /^[\p{Script=Katakana}ー]$/u;
const PUNCT_ONLY = /^[\s、。！？「」（）()[\]【】・…—\-,.!?]+$/u;
const DIGITS_ONLY = /^[0-9０-９]+$/u;
// 動詞活用末尾断片（TinySegmenter は POS なしなのでここで弾く）
const CONJUGATION_FRAGMENT = /^(なかっ|られ|れる|せる|させ|でき|やっ|なっ|あっ|いっ|きっ|しまっ|だっ|すぎ|そう|よう|べき|たく|たかっ|なく|なけれ|なら|ろう)$/;
// 漢字 + 末尾1-2文字ひらがなのうち、末尾が活用語尾っぽいものは動詞語幹（=未確定形）として除外。
// 例: 「悪く」「言わ」「残し」「守り」「良かっ」「わから」「起こ」
// 末尾文字が く/し/り/わ/っ/か/こ で、かつ語幹に漢字を含むトークンを弾く。
const VERB_STEM_TAIL = /[くしりわっかこ]$/;
const HAS_KANJI = /\p{Script=Han}/u;

export type WordFreq = { word: string; count: number };

export function extractWordFrequencies(texts: string[], topN = 20): WordFreq[] {
  if (texts.length === 0) return [];

  const segmenter = new TinySegmenter();
  const counts = new Map<string, number>();

  for (const text of texts) {
    if (!text) continue;
    const tokens: string[] = segmenter.segment(text);
    for (const raw of tokens) {
      const word = raw.trim();
      if (!word) continue;
      if (STOPWORDS.has(word)) continue;
      if (HIRAGANA_SHORT.test(word)) continue;
      if (KATAKANA_ONE_CHAR.test(word)) continue;
      if (CONJUGATION_FRAGMENT.test(word)) continue;
      if (HAS_KANJI.test(word) && VERB_STEM_TAIL.test(word)) continue;
      if (PUNCT_ONLY.test(word)) continue;
      if (DIGITS_ONLY.test(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
