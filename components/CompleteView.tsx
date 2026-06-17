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
  /** サーバ集計の STREAK（JST 固定）。LOG タブと信頼源を揃える。 */
  serverStreak?: number;
  onBack: () => void;
};

export default function CompleteView({ post, posts, totalDurationMs, serverStreak, onBack }: Props) {
  // 7日帯はローカル日付で描画（clientStreak も SILENCE 表現と整合）。
  const { streak: clientStreak, week } = computeStreak(posts);
  // STREAK 数字はサーバ集計を信頼源にしつつ、投稿直後でサーバ値が未更新のケースを
  // クライアント計算（今投稿した分を含む）でカバーするため大きい方を採用。
  const streak = Math.max(serverStreak ?? 0, clientStreak);

  // 累計録音分数（サーバ集計が信頼源、未取得時は posts から fallback）。IndexView と共有。
  const totalMinutes = totalRecordedMinutes(totalDurationMs, posts);

  // 入場アニメ（streak 帯 ≈ 1.2s）の後に着地させる。
  const minutesView = useCountUp(totalMinutes, { delayMs: 1200 });
  const streakView = useCountUp(streak, { delayMs: 1200 });

  return (
    <section className="complete-view">
      <p className="complete-stamp font-display">CARVED.</p>
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
