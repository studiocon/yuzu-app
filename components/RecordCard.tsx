"use client";

import type { Post } from "@/lib/types";

type Props = {
  post: Post;
  onOpenDetail?: (post: Post) => void;
};

const formatTimeLabel = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}日前`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

export default function RecordCard({ post, onOpenDetail }: Props) {
  // カード全体タップで詳細モーダルを開く（COPY / MARK はモーダル内に移設）。
  const open = () => onOpenDetail?.(post);

  return (
    <article
      className={"post-card post-card--tappable" + (post.marked ? " is-marked" : "")}
      role="button"
      tabIndex={0}
      aria-label={`#${post.index} を開く`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="post-header">
        <time className="post-time font-display">{formatTimeLabel(post.createdAt)}</time>
        <span className="post-index font-display">#{post.index}</span>
      </div>
      <div className="post-body">
        <p className="post-text">{post.text}</p>
      </div>
    </article>
  );
}
