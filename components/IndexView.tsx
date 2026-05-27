"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RecordCard from "./RecordCard";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";

type Filter = "all" | "pinned";

type Props = {
  myPosts: Post[];
  /** サーバ集計の総 RECORDS 数（identity `#NNN` / STATS の信頼源）。0 なら fallback。 */
  totalCount?: number;
  /** サーバ集計の STREAK（JST 固定）。0 なら fallback。 */
  serverStreak?: number;
  /** サーバから取得した初回投稿日時。null/undef は myPosts[last] から fallback。 */
  firstPostAt?: number | null;
  /** 初回 fetch 中（posts === null） */
  loading?: boolean;
  /** ページング: まだ取れる行があるか */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenDetail?: (post: Post) => void;
  onToggleMark?: (post: Post, next: boolean) => void;
};

function formatSinceShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function IndexView({
  myPosts,
  totalCount,
  serverStreak,
  firstPostAt: firstPostAtProp,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenDetail,
  onToggleMark,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // STATS の信頼源はサーバ集計。undefined のときは client 集計に fallback（mock / 過渡期）。
  const streak = typeof serverStreak === "number" ? serverStreak : computeStreak(myPosts).streak;
  const recordsCount = typeof totalCount === "number" ? totalCount : myPosts.length;
  const firstPostAt = typeof firstPostAtProp === "number"
    ? firstPostAtProp
    : (myPosts.length > 0 ? myPosts[myPosts.length - 1].createdAt : null);
  const filteredPosts = useMemo(() => {
    if (filter === "pinned") return myPosts.filter((p) => p.marked);
    return myPosts;
  }, [myPosts, filter]);

  const sinceLabel = firstPostAt !== null ? formatSinceShort(firstPostAt) : "—";

  // ── 無限スクロール: 末尾 sentinel が見えたら onLoadMore 発火 ──
  useEffect(() => {
    if (!hasMore || !onLoadMore || filter === "pinned") return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: "400px 0px" }, // 400px 手前で先読み
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore, loadingMore, filter]);

  return (
    <section className="index-view">
      <div className="mypage-stats">
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">RECORDS</span>
          <span className="mypage-stat-value font-display">{recordsCount}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">SINCE</span>
          <span className="mypage-stat-value font-display">{sinceLabel}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">STREAK</span>
          <span className="mypage-stat-value font-display">{streak}</span>
        </div>
      </div>

      <section className="mypage-section">
        <div className="records-section-head">
          <h3 className="mypage-section-title font-display">RECORDS</h3>
          <div className="records-filter" role="tablist" aria-label="RECORDS フィルタ">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              className={"records-filter-item font-display" + (filter === "all" ? " is-active" : "")}
              onClick={() => setFilter("all")}
            >
              ALL
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "pinned"}
              className={"records-filter-item font-display" + (filter === "pinned" ? " is-active" : "")}
              onClick={() => setFilter("pinned")}
            >
              PINNED
            </button>
          </div>
        </div>
        <div className="mypage-post-list">
          {loading ? (
            <div aria-busy="true" aria-label="解読中" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="record-card-skeleton">
                  <div className="skeleton-row">
                    <div className="skeleton-block skeleton-block--kind" />
                    <div className="skeleton-block skeleton-block--kind" />
                  </div>
                  <div className="skeleton-block skeleton-block--line" />
                  <div className="skeleton-block skeleton-block--line skeleton-block--line-short" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredPosts.length === 0 && (
                <p className="mypage-empty">
                  {filter === "pinned" ? "MARK されたものは無い。" : "話せ。"}
                </p>
              )}
              {filteredPosts.map((p) => (
                <RecordCard
                  key={p.id}
                  post={p}
                  onOpenDetail={onOpenDetail}
                  onToggleMark={onToggleMark}
                />
              ))}
              {/* 無限スクロール sentinel（ALL のときだけ次ページを取りに行く） */}
              {hasMore && filter === "all" && (
                <div ref={sentinelRef} className="records-sentinel" aria-hidden>
                  {loadingMore && <span className="font-display">LOADING.</span>}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </section>
  );
}
