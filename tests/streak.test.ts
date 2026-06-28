import { describe, it, expect } from "vitest";
import { computeStreak, dayKey } from "../lib/streak";
import type { Post } from "../lib/types";

// CLAUDE.md が繰り返し警告する「今日 or 昨日まで続いていれば切れない」挙動を固定する。
// 過去にここが 3 層の silent fail で壊れて「昨日投稿したのに STREAK 0」を起こした。

const DAY = 24 * 60 * 60 * 1000;

// ローカルタイムの「その日の正午」を作る（dayKey はローカルタイム基準）。
function localNoon(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
}

function post(ts: number): Post {
  return { id: String(ts), user_id: "u", text: "x", char_count: 1, durationMs: 0, createdAt: ts, index: 1, marked: false };
}

describe("computeStreak", () => {
  const now = new Date(2026, 5, 29, 15, 0, 0); // 2026-06-29 15:00 ローカル

  it("投稿ゼロなら streak 0", () => {
    expect(computeStreak([], now).streak).toBe(0);
  });

  it("今日投稿していれば今日から数える", () => {
    const posts = [post(localNoon(now)), post(localNoon(new Date(now.getTime() - DAY)))];
    expect(computeStreak(posts, now).streak).toBe(2);
  });

  it("今日未投稿でも昨日まで続いていれば維持される", () => {
    const yesterday = new Date(now.getTime() - DAY);
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY);
    const posts = [post(localNoon(yesterday)), post(localNoon(twoDaysAgo))];
    expect(computeStreak(posts, now).streak).toBe(2);
  });

  it("一昨日までしか無い（昨日が空白）なら 0", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY);
    expect(computeStreak([post(localNoon(twoDaysAgo))], now).streak).toBe(0);
  });

  it("同日複数投稿は 1 日としてカウント", () => {
    const t = localNoon(now);
    const posts = [post(t), post(t + 60_000), post(t + 120_000)];
    expect(computeStreak(posts, now).streak).toBe(1);
  });

  it("week は 7 要素・最後が今日", () => {
    const { week } = computeStreak([post(localNoon(now))], now);
    expect(week).toHaveLength(7);
    expect(week[6].isToday).toBe(true);
    expect(week[6].done).toBe(true);
  });
});

describe("dayKey", () => {
  it("ゼロ埋め YYYY-MM-DD", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
