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
  // 実データ検証で junk と確認された副詞・接続表現
  "いろいろ", "なかなか", "ちゃんと", "たくさん", "できる", "できた",
  "というか", "っていう", "っていうか", "みたいな", "けれども",
  "そういう", "こういう", "どういう", "そういった", "こういった",
  // 記号・空文字
  " ", "　", "、", "。", "！", "？", "「", "」", "（", "）", ".", ",", "!", "?",
]);

// 3 文字以下の純ひらがなトークンは助詞・活用語尾の断片であることが大半なので一律除外。
// 内容語（名詞・動詞語幹）はほぼ漢字・カタカナを含むので signal が改善する。
// 実データ53投稿で検証済み：3文字の純ひらがなは「だけど・として・ながら・ぐらい・
// やはり・ちゃん・いいか・られる」等の機能語がほぼすべてで、内容語はまず混ざらない。
const HIRAGANA_SHORT = /^[\p{Script=Hiragana}ー]{1,3}$/u;
const KATAKANA_ONE_CHAR = /^[\p{Script=Katakana}ー]$/u;
const PUNCT_ONLY = /^[\s、。！？「」（）()[\]【】・…—\-,.!?]+$/u;
const DIGITS_ONLY = /^[0-9０-９]+$/u;
// 長音・波線のみのトークン（「ー」「ーーー」「〜」等）。STT が語尾の伸びを
// 独立トークンとして残すことがあるので、内容を持たない記号として除外する。
const LONG_VOWEL_ONLY = /^[ーｰ〜～]+$/u;
// 形式名詞・助数詞・接尾辞として出る汎用単漢字のブロックリスト。
// 「夏」「雨」「声」のような意味のある単漢字は残したいので、全単漢字除外ではなく
// 明示リストで弾く（実データ検証で TOP20 に混入していたもの）。
const GENERIC_SINGLE_KANJI = new Set([
  "方", "何", "的", "日", "中", "時", "前", "後", "一", "二", "三",
  "上", "下", "間", "他", "分", "回", "度", "数", "点", "円", "年", "月", "週", "性",
]);
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
      if (LONG_VOWEL_ONLY.test(word)) continue;
      if (HIRAGANA_SHORT.test(word)) continue;
      if (GENERIC_SINGLE_KANJI.has(word)) continue;
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
