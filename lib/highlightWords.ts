// その RECORD の「内容語」を本文中で強調するための純ロジック。
// AI を使わず、wordAnalysis（TinySegmenter + ストップワード除去）をクライアントで再利用する。
// SDK 非依存・オフライン/mock 動作可。
import { extractWordFrequencies } from "./wordAnalysis";

// 漢字 or カタカナを含むトークンだけをハイライト対象にする。
// WORDS（INSIGHT）は全コーパスの頻度上位20で自然にノイズが落ちるが、1件の短文では
// 「として」等の機能語・「一」「日」等の単漢字が頻度フィルタを抜ける。wordAnalysis の
// 「内容語はほぼ漢字・カタカナを含む」方針（wordAnalysis.ts 冒頭コメント）に合わせて絞る。
const CONTENT_CHAR = /[\p{Script=Han}\p{Script=Katakana}]/u;

// 1 件の RECORD から内容語（シグナル語）の集合を取り出す。
// topN は切らず、フィルタを通った内容語をすべて対象にする（短文では頻度差が出ないため）。
export function recordWords(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    extractWordFrequencies([text], Number.MAX_SAFE_INTEGER)
      .map((w) => w.word)
      .filter((w) => w.length >= 2 && CONTENT_CHAR.test(w)),
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
