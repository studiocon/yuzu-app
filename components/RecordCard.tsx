"use client";

import { useState } from "react";
import { Copy, PushPin, PushPinSlash } from "@phosphor-icons/react";
import type { Post } from "@/lib/types";

type Props = {
  post: Post;
  onOpenDetail?: (post: Post) => void;
  onToggleMark?: (post: Post, next: boolean) => void;
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

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function RecordCard({ post, onOpenDetail, onToggleMark }: Props) {
  const [justMarked, setJustMarked] = useState(false);
  const [copied, setCopied] = useState(false);

  const fireMark = () => {
    if (!onToggleMark) return;
    const next = !post.marked;
    onToggleMark(post, next);
    if (next) {
      setJustMarked(true);
      setTimeout(() => setJustMarked(false), 900);
    }
  };

  // TEMPORARY: Notion移行期間限定のコピー機能。
  // 削除トリガー: オーナー（こんちゃん）が Notion 併用を止めたタイミング。
  // 詳細は PRD.md "COPY（一時機能 / ⚠️ 将来削除予定）" 節を参照。
  const handleCopy = async () => {
    const payload = `#${String(post.index).padStart(3, "0")}  ${formatTimestamp(post.createdAt)}\n${post.text}`;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }
  };

  return (
    <article className={"post-card" + (post.marked ? " is-marked" : "")}>
      <div className="post-header">
        <time className="post-time font-display">{formatTimeLabel(post.createdAt)}</time>
        {onOpenDetail ? (
          <button
            type="button"
            className="post-index post-index--btn font-display"
            onClick={() => onOpenDetail(post)}
            aria-label={`#${post.index} を開く`}
          >
            #{String(post.index).padStart(3, "0")}
          </button>
        ) : (
          <span className="post-index font-display">#{String(post.index).padStart(3, "0")}</span>
        )}
        <span className="post-actions">
          {onToggleMark && (
            <button
              type="button"
              className={"post-iconbtn post-mark-btn" + (post.marked ? " is-marked" : "")}
              onClick={fireMark}
              aria-label={post.marked ? "MARK を外す" : "MARK する"}
              aria-pressed={post.marked}
              title={post.marked ? "MARKED." : "MARK"}
            >
              {post.marked
                ? <PushPin size={16} weight="fill" />
                : <PushPinSlash size={16} weight="regular" />}
            </button>
          )}
          {/* TEMPORARY: Notion移行期間限定のコピー機能。YUZU運用が完全移行したら削除する。 */}
          <button
            type="button"
            className={"post-iconbtn post-copy-btn" + (copied ? " is-copied" : "")}
            onClick={handleCopy}
            aria-label={copied ? "COPIED." : "本文をコピー"}
            title={copied ? "COPIED." : "COPY"}
          >
            <Copy size={16} weight="regular" />
          </button>
        </span>
      </div>
      <div className="post-body">
        <p className="post-text">{post.text}</p>
      </div>
      {justMarked && <span className="post-mark-flash font-display" aria-hidden>MARKED.</span>}
      {copied && <span className="post-copy-flash font-display" aria-hidden>COPIED.</span>}
    </article>
  );
}
