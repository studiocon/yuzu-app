import { jstDateString, jstHour, DAY_MS } from "./period";

export type HeatmapCell = { date: string; bucket: number; charCount: number };

export function buildHeatmap(
  posts: { text: string; createdAt: number }[],
  days = 42,
  now: number = Date.now(),
): HeatmapCell[] {
  // 過去 days 日分の date を JST で列挙（古い → 新しい）
  const dates: string[] = [];
  const dateSet = new Set<string>();
  for (let i = days - 1; i >= 0; i--) {
    const d = jstDateString(now - i * DAY_MS);
    dates.push(d);
    dateSet.add(d);
  }
  const cutoff = now - days * DAY_MS;

  const sums = new Map<string, number>(); // key = `${date}|${hour}`
  for (const p of posts) {
    if (p.createdAt < cutoff) continue;
    const date = jstDateString(p.createdAt);
    if (!dateSet.has(date)) continue;
    const bucket = Math.floor(jstHour(p.createdAt) / 4);
    const key = `${date}|${bucket}`;
    sums.set(key, (sums.get(key) ?? 0) + (p.text?.length ?? 0));
  }

  const cells: HeatmapCell[] = [];
  for (const date of dates) {
    for (let bucket = 0; bucket < 6; bucket++) {
      cells.push({ date, bucket, charCount: sums.get(`${date}|${bucket}`) ?? 0 });
    }
  }
  return cells;
}
