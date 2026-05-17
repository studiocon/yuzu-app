"use client";

import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";

type Props = { post: Post; posts: Post[]; onBack: () => void };

export default function CompleteView({ post, posts, onBack }: Props) {
  const { streak, week } = computeStreak(posts);
  return (
    <section className="complete-view">
      <p className="complete-stamp font-display">RECORDED.</p>
      <div className="complete-card">
        <p className="complete-text">{post.text}</p>
      </div>

      <div className="streak-block">
        <div className="streak-week" aria-hidden>
          {week.map((d, i) => (
            <div key={i} className="streak-day" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
              <span className="streak-day-label">{d.label}</span>
              <span className={"streak-day-check" + (d.done ? " done" : "") + (d.isToday ? " today" : "")}>
                {d.done ? "✓" : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="streak-headline">
          <span className="streak-count font-display">{streak}</span>
          <span className="streak-unit font-display">STREAK</span>
        </p>
      </div>

      <button type="button" className="complete-back-btn" onClick={onBack}>
        ホームに戻る
      </button>
    </section>
  );
}
