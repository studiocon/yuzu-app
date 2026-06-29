"use client";

import { useMemo, type CSSProperties } from "react";
import type { Post } from "@/lib/types";
import { sentimentColor } from "@/lib/sentimentColor";
import { formatDuration } from "@/lib/stats";
import { seededHeights, voiceprintBarCount } from "@/lib/voiceprint";

type Props = {
  post: Post;
  /** 感情スコア（-1.0〜1.0）。未解析なら undefined → 左端バー非表示。 */
  score?: number;
  /** スクロールイン stagger のディレイ（ms）。IntersectionObserver で is-visible が付いた時に効く。 */
  revealDelayMs?: number;
  onOpenDetail?: (post: Post) => void;
};

export default function RecordCard({ post, score, revealDelayMs = 0, onOpenDetail }: Props) {
  // カード全体タップで詳細モーダルを開く（COPY / MARK はモーダル内に移設）。
  const open = () => onOpenDetail?.(post);

  const edgeColor = sentimentColor(score);
  const durationLabel = post.durationMs > 0 ? formatDuration(post.durationMs) : null;

  // 録音長に応じた擬似「声紋」。bar 本数 = 長さ（秒）に比例（8〜40 本）。
  // durationMs=0 の旧データは波形を出さない（graceful）。
  const bars = useMemo(() => {
    const count = voiceprintBarCount(post.durationMs);
    return count === null ? null : seededHeights(post.id, count);
  }, [post.id, post.durationMs]);

  return (
    <article
      className={"post-card post-card--tappable post-card--reveal" + (post.marked ? " is-marked" : "")}
      style={{ ["--reveal-delay" as string]: `${revealDelayMs}ms` } as CSSProperties}
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
      {edgeColor && (
        <span className="post-card-edge" style={{ background: edgeColor }} aria-hidden />
      )}
      <div className="post-header">
        <span className="post-index font-display">#{post.index}</span>
        {durationLabel && <span className="post-duration font-display">{durationLabel}</span>}
      </div>
      <div className="post-body">
        <p className="post-text">{post.text}</p>
      </div>
      {bars && (
        <div className="post-voiceprint" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} className="post-voiceprint-bar" style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
      )}
    </article>
  );
}
