"use client";

import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";
import { totalRecordedMinutes } from "@/lib/stats";
import { useCountUp } from "@/lib/useCountUp";

type Props = {
  post: Post;
  posts: Post[];
  /** サーバ集計の総録音時間（ms）。undefined は posts から fallback。 */
  totalDurationMs?: number;
  onBack: () => void;
};

export default function CompleteView({ post, posts, totalDurationMs, onBack }: Props) {
  const { streak, week } = computeStreak(posts);

  // 累計録音分数（サーバ集計が信頼源、未取得時は posts から fallback）。IndexView と共有。
  const totalMinutes = totalRecordedMinutes(totalDurationMs, posts);

  // 入場アニメ（streak 帯 ≈ 1.2s）の後に着地させる。
  const minutesView = useCountUp(totalMinutes, { delayMs: 1200 });
  const streakView = useCountUp(streak, { delayMs: 1200 });

  return (
    <section className="complete-view">
      <p className="complete-stamp font-display">RECORDED.</p>
      <p className="complete-index font-display">#{post.index}</p>
      <div className="complete-card">
        <p className="complete-text">{post.text}</p>
      </div>

      <div className="streak-block">
        <div className="streak-week" aria-hidden>
          {week.map((d, i) => (
            <div key={i} className="streak-day" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
              <span className="streak-day-label">{d.label}</span>
              <span className={"streak-day-check" + (d.done ? " done" : "") + (d.isToday ? " today" : "")}>
                {d.done ? "✓" : null}
              </span>
            </div>
          ))}
        </div>

        <div className="complete-stats">
          <div className="complete-stat-card">
            <span className="complete-stat-label font-display">MINUTES</span>
            <span className="complete-stat-value font-display">{minutesView}</span>
          </div>
          <div className="complete-stat-card">
            <span className="complete-stat-label font-display">STREAK</span>
            <span className="complete-stat-value font-display">{streakView}</span>
          </div>
        </div>
      </div>

      <div className="complete-actions">
        <button type="button" className="complete-back-btn" onClick={onBack}>
          閉じる
        </button>
      </div>
    </section>
  );
}
