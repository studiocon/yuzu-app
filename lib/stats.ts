import type { Post } from "./types";

/**
 * 累計録音分数を求める。サーバ集計（totalDurationMs）が信頼源で、
 * undefined のときは読み込み済み posts の durationMs 合計に fallback する。
 * IndexView の STATS と CompleteView の完了画面 STATS で共有（重複防止）。
 */
export function totalRecordedMinutes(
  totalDurationMs: number | undefined,
  posts: Post[],
): number {
  const totalMs =
    typeof totalDurationMs === "number"
      ? totalDurationMs
      : posts.reduce((sum, p) => sum + (p.durationMs ?? 0), 0);
  return Math.floor(totalMs / 60000);
}

/**
 * 録音時間を m:ss 形式に整形する（例 84000ms → "1:24"）。
 * SpeakView のカウントダウン表記と同じ体裁。1 件の RECORD の事実表示に使う。
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * その記録が登録（最初の投稿）から何日目かを返す（1-based、ローカル日付基準）。
 * lib/streak.ts と同じくローカルタイムで日付を割る（JST に DST なし）。
 * createdAt が firstPostAt より前など算出不能なケースは 0 以下を返し、呼び出し側で非表示判定する。
 */
export function dayNumberSince(createdAt: number, firstPostAt: number): number {
  const startOfDay = (ts: number) => {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const diffDays = Math.round((startOfDay(createdAt) - startOfDay(firstPostAt)) / 86400000);
  return diffDays + 1;
}
