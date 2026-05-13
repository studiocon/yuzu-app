import type { Post } from "./types";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export type WeekDay = { label: string; done: boolean; isToday: boolean };

export function computeStreak(posts: Post[], now: Date = new Date()): { streak: number; week: WeekDay[] } {
  const days = new Set(posts.map((p) => dayKey(new Date(p.createdAt))));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let streak = 0;
  const cursor = new Date(today);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const week: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    week.push({
      label: WEEKDAY_JA[d.getDay()],
      done: days.has(dayKey(d)),
      isToday: i === 0,
    });
  }

  return { streak, week };
}
