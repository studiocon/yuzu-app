// その RECORD の本文中で「WORDS（INSIGHT の頻出語トップ20）」に入っている語だけを
// 強調するための純ロジック。AI を使わず、wordAnalysis をクライアントで再利用する。
// SDK 非依存・オフライン/mock 動作可。
import { extractWordFrequencies } from "./wordAnalysis";

// 漢字 or カタカナを含むトークンだけをハイライト対象にする。
const CONTENT_CHAR = /[\p{Script=Han}\p{Script=Katakana}]/u;

// wordAnalysis.ts の extractWordFrequencies 自体は単漢字を弾かない（「明日」が「明」+「日」に割れて
// 「日」が頻出語トップ20に混ざることがある）。WORDS の語をそのまま使う場合でも、本文ハイライトとしては
// 単漢字1文字はノイズが過ぎるので、globalWords 経由でも 2 文字未満は弾く。
const isHighlightable = (w: string): boolean => w.length >= 2 && CONTENT_CHAR.test(w);

/**
 * 1 件の RECORD からハイライト対象の語集合を取り出す。
 * - globalWords（WORDS/INSIGHT の頻出語トップ20。lib/wordAnalysis.ts の extractWordFrequencies と同じ算出）が
 *   渡されたら、その中で本文に実際に出現する語だけを返す＝「WORDSのワードを自動ハイライト」。
 *   全コーパス横断で頻出する語に絞られるので、1件の記録の内容語を総ざらいするより自然に少数になる。
 * - globalWords が無い（呼び出し側が未配線）場合のみ、記録単体の内容語抽出にフォールバックする。
 */
export function recordWords(text: string, globalWords?: Set<string>): Set<string> {
  if (!text) return new Set();
  if (globalWords && globalWords.size > 0) {
    const hits = new Set<string>();
    for (const w of globalWords) {
      if (isHighlightable(w) && text.includes(w)) hits.add(w);
    }
    return hits;
  }
  return new Set(
    extractWordFrequencies([text], Number.MAX_SAFE_INTEGER)
      .map((w) => w.word)
      .filter(isHighlightable),
  );
}

export type HighlightSegment = { text: string; mark: boolean };

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 段落文字列を、内容語にマッチする区間（mark=true）としない区間（mark=false）の
 * セグメント配列に分解する。
 * - 内容語は TinySegmenter 由来なので原文の部分文字列としてそのまま出現する。
 * - 長い語を優先してマッチさせ、重なりは飲み込む（「自己肯定感」と「肯定」が両方語彙にあっても長い方を1区間に）。
 * - マッチが無ければ [{ text, mark:false }] を返す（graceful）。
 */
export function splitHighlights(text: string, words: Set<string>): HighlightSegment[] {
  if (!text) return [];
  if (words.size === 0) return [{ text, mark: false }];

  // 長い語を優先（重なり時に長い語を勝たせる）。
  const sorted = [...words].filter((w) => w.length > 0).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return [{ text, mark: false }];

  const re = new RegExp(sorted.map(escapeRegExp).join("|"), "g");

  const segments: HighlightSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index === re.lastIndex) {
      re.lastIndex++; // ゼロ幅マッチの保険
      continue;
    }
    if (m.index > last) segments.push({ text: text.slice(last, m.index), mark: false });
    segments.push({ text: m[0], mark: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), mark: false });
  return segments.length > 0 ? segments : [{ text, mark: false }];
}
