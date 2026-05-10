"use client";

import StampBar from "./StampBar";
import { type Stamp } from "@/lib/stamps";

export type Post = {
  id: string;
  text: string;
  createdAt: number;
  emoji: string;
  blob: [string, string, string];
  reactions: Record<Stamp, number>;
  reacted: Stamp[];
  sessionId?: string;
};

type Props = {
  posts: Post[];
  newPostId: string | null;
};

export default function TimelineView({ posts, newPostId }: Props) {
  return (
    <section className="timeline-view">
      {posts.length === 0 ? (
        <p className="timeline-empty">
          まだ誰も話していない。<br />最初の声を植えよう。
        </p>
      ) : (
        posts.map((p) => (
          <article
            key={p.id}
            className={`post-card${p.id === newPostId ? " new" : ""}`}
          >
            <div className="post-header">
              <div className="post-emoji" aria-hidden>{p.emoji ?? "🍑"}</div>
              <span className="post-name">ななしさん</span>
              <time className="post-time">{formatDate(p.createdAt)}</time>
            </div>
            <div className="post-body">
              <p className="post-text">{p.text}</p>
              <StampBar postId={p.id} reactions={p.reactions} reacted={p.reacted} />
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function formatDate(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
