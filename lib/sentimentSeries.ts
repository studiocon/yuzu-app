import type { Post } from "./types";
import { jstDateString, DAY_MS } from "./period";

export type SentimentPoint = { date: string; score: number };

// 投稿群を JST 日付で集約し、その日の平均センチメントスコアを返す。
export function computeSentimentSeries(
  posts: Post[],
  scores: Record<string, number>,
): SentimentPoint[] {
  const byDate = new Map<string, number[]>();
  for (const p of posts) {
    const s = scores[p.id];
    if (typeof s !== "number") continue;
    const d = jstDateString(p.createdAt);
    const arr = byDate.get(d) ?? [];
    arr.push(s);
    byDate.set(d, arr);
  }
  return [...byDate.entries()]
    .map(([date, arr]) => ({ date, score: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// 日次系列を週次（日曜始まり）で平均化する。ALL モードの描画密度を抑えるため。
export function aggregateSentimentByWeek(points: SentimentPoint[]): SentimentPoint[] {
  const byWeek = new Map<string, number[]>();
  for (const p of points) {
    const [y, m, d] = p.date.split("-").map(Number);
    if (!y || !m || !d) continue;
    const utcMs = Date.UTC(y, m - 1, d);
    const dow = new Date(utcMs).getUTCDay();
    const weekStart = utcMs - dow * DAY_MS;
    const key = new Date(weekStart).toISOString().slice(0, 10);
    const arr = byWeek.get(key) ?? [];
    arr.push(p.score);
    byWeek.set(key, arr);
  }
  return [...byWeek.entries()]
    .map(([date, arr]) => ({ date, score: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
