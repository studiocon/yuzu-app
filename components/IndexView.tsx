"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SentimentChart from "./SentimentChart";
import RecordCard from "./RecordCard";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";
import { computeSentimentSeries } from "@/lib/sentimentSeries";
import { loadSentimentCache, saveSentimentCache } from "@/lib/userClient";

type Filter = "all" | "pinned";

type Props = {
  myPosts: Post[];
  /** サーバ集計の総 RECORDS 数（identity `#NNN` / STATS の信頼源）。0 なら fallback。 */
  totalCount?: number;
  /** サーバ集計の STREAK（JST 固定）。0 なら fallback。 */
  serverStreak?: number;
  /** サーバから取得した初回投稿日時。null/undef は myPosts[last] から fallback。 */
  firstPostAt?: number | null;
  /** ページング: まだ取れる行があるか */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenDetail?: (post: Post) => void;
  onToggleMark?: (post: Post, next: boolean) => void;
};

function formatIndex(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}

export default function IndexView({
  myPosts,
  totalCount,
  serverStreak,
  firstPostAt: firstPostAtProp,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenDetail,
  onToggleMark,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [cache, setCache] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCache(loadSentimentCache());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || myPosts.length === 0) return;
    const unresolved = myPosts.filter((p) => !(p.id in cache));
    if (unresolved.length === 0) return;

    let cancelled = false;
    setAnalyzing(true);
    (async () => {
      try {
        const res = await fetch("/api/analyze-sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posts: unresolved.map((p) => ({ id: p.id, text: p.text, createdAt: p.createdAt })),
          }),
        });
        if (!res.ok) throw new Error("感情分析に失敗");
        const data = (await res.json()) as { results: { postId: string; score: number }[] };
        if (cancelled) return;
        const next = { ...cache };
        for (const r of data.results) next[r.postId] = r.score;
        setCache(next);
        saveSentimentCache(next);
      } catch {
        // 失敗時は次回再試行
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, myPosts]);

  const sentimentData = useMemo(
    () => computeSentimentSeries(myPosts, cache),
    [myPosts, cache],
  );

  // STATS の信頼源はサーバ集計。undefined のときは client 集計に fallback（mock / 過渡期）。
  const streak = typeof serverStreak === "number" ? serverStreak : computeStreak(myPosts).streak;
  const recordsCount = typeof totalCount === "number" ? totalCount : myPosts.length;
  const latestIndex = myPosts.length > 0 ? myPosts[0].index : null;
  const firstPostAt = typeof firstPostAtProp === "number"
    ? firstPostAtProp
    : (myPosts.length > 0 ? myPosts[myPosts.length - 1].createdAt : null);
  const daysSinceStart = useMemo(() => {
    if (firstPostAt === null) return 0;
    const start = new Date(firstPostAt);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.floor((today - startDay) / 86400000) + 1;
  }, [firstPostAt]);

  const filteredPosts = useMemo(() => {
    if (filter === "pinned") return myPosts.filter((p) => p.marked);
    return myPosts;
  }, [myPosts, filter]);

  const headerNumber = latestIndex !== null ? formatIndex(latestIndex) : "#000";

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
      <h2 className="index-number font-display" aria-label={`通し番号 ${headerNumber}`}>
        {headerNumber}
      </h2>

      <div className="mypage-stats">
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">DAY</span>
          <span className="mypage-stat-value font-display">{daysSinceStart}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">RECORDS</span>
          <span className="mypage-stat-value font-display">{recordsCount}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">STREAK</span>
          <span className="mypage-stat-value font-display">{streak}</span>
        </div>
      </div>

      {(sentimentData.length > 0 || analyzing) && (
        <section className="mypage-section">
          <h3 className="mypage-section-title font-display">SENTIMENT</h3>
          <div className="mypage-chart-card">
            {analyzing ? (
              <p className="mypage-loading-hint">DECODING.</p>
            ) : sentimentData.length < 3 ? (
              <p className="sentiment-empty">声が少ない</p>
            ) : (
              <SentimentChart data={sentimentData} />
            )}
          </div>
        </section>
      )}

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
        </div>
      </section>
    </section>
  );
}
