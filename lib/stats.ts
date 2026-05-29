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
