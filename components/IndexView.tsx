"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import RecordCard from "./RecordCard";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";
import { totalRecordedMinutes } from "@/lib/stats";
import { useCountUp } from "@/lib/useCountUp";
import { jstDateString, DAY_MS } from "@/lib/period";

type Filter = "all" | "marked";

const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type DayGroup = { key: string; label: string; posts: Post[] };

// 日付区切りの見出し。今日/昨日は英語状態ラベル、それ以外は M.D 曜（英語＝状態）。句点なし。
function dividerLabel(dateKey: string, todayKey: string, yesterdayKey: string): string {
  if (dateKey === todayKey) return "TODAY";
  if (dateKey === yesterdayKey) return "YESTERDAY";
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}.${d} ${WEEKDAY_EN[dow]}`;
}

type Props = {
  myPosts: Post[];
  /** 感情スコア（postId → -1.0〜1.0）。カード左端バーの着色に使う。 */
  scores?: Record<string, number>;
  /** サーバ集計の総 RECORDS 数（identity `#NNN` / STATS の信頼源）。0 なら fallback。 */
  totalCount?: number;
  /** サーバ集計の STREAK（JST 固定）。0 なら fallback。 */
  serverStreak?: number;
  /** サーバ集計の総録音時間（ms）。undefined は myPosts から fallback。 */
  totalDurationMs?: number;
  /** 初回 fetch 中（posts === null） */
  loading?: boolean;
  /** ページング: まだ取れる行があるか */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onOpenDetail?: (post: Post) => void;
};

export default function IndexView({
  myPosts,
  scores,
  totalCount,
  serverStreak,
  totalDurationMs,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpenDetail,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // STATS の信頼源はサーバ集計。undefined のときは client 集計に fallback（mock / 過渡期）。
  const streak = typeof serverStreak === "number" ? serverStreak : computeStreak(myPosts).streak;
  const recordsCount = typeof totalCount === "number" ? totalCount : myPosts.length;
  // 総録音分数（サーバ集計が信頼源、未取得時は posts から fallback）。CompleteView と共有。
  const totalMinutes = totalRecordedMinutes(totalDurationMs, myPosts);

  // STATS カウントアップ（アクセス時 0 → 値）。reduced-motion は useCountUp 内で即値。
  const recordsUp = useCountUp(recordsCount, { delayMs: 150 });
  const minutesUp = useCountUp(totalMinutes, { delayMs: 150 });
  const streakUp = useCountUp(streak, { delayMs: 150 });

  const filteredPosts = useMemo(() => {
    if (filter === "marked") return myPosts.filter((p) => p.marked);
    return myPosts;
  }, [myPosts, filter]);

  // 投稿を JST 日付でグルーピング（newest-first の並びを保持）。
  const groups = useMemo<DayGroup[]>(() => {
    const now = Date.now();
    const todayKey = jstDateString(now);
    const yesterdayKey = jstDateString(now - DAY_MS);
    const out: DayGroup[] = [];
    for (const p of filteredPosts) {
      const key = jstDateString(p.createdAt);
      const last = out[out.length - 1];
      if (!last || last.key !== key) {
        out.push({ key, label: dividerLabel(key, todayKey, yesterdayKey), posts: [p] });
      } else {
        last.posts.push(p);
      }
    }
    return out;
  }, [filteredPosts]);

  // ── 無限スクロール: 末尾 sentinel が見えたら onLoadMore 発火 ──
  useEffect(() => {
    if (!hasMore || !onLoadMore || filter === "marked") return;
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
      <div className="mypage-stats" aria-busy={loading ? "true" : undefined}>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">RECORDS</span>
          <span className="mypage-stat-value font-display">
            {loading ? <span className="skeleton-block skeleton-block--stat" /> : recordsUp}
          </span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">MINUTES</span>
          <span className="mypage-stat-value font-display">
            {loading ? <span className="skeleton-block skeleton-block--stat" /> : minutesUp}
          </span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">STREAK</span>
          <span className="mypage-stat-value font-display">
            {loading ? <span className="skeleton-block skeleton-block--stat" /> : streakUp}
          </span>
        </div>
      </div>

      <section className="mypage-section">
        <div className="records-section-head">
          <h3 className="mypage-section-title font-display">RECORDS</h3>
          <div className="section-filter" role="tablist" aria-label="RECORDS フィルタ">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              className={"section-filter-item font-display" + (filter === "all" ? " is-active" : "")}
              onClick={() => setFilter("all")}
            >
              ALL
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "marked"}
              className={"section-filter-item font-display" + (filter === "marked" ? " is-active" : "")}
              onClick={() => setFilter("marked")}
            >
              MARKED
            </button>
          </div>
        </div>
        <div className="mypage-post-list">
          {loading ? (
            <div aria-busy="true" aria-label="読み取り中" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          ) : filteredPosts.length === 0 ? (
            <p className="mypage-empty">
              {filter === "marked" ? "MARK されたものは無い" : "話せ"}
            </p>
          ) : (
            <div className="post-timeline">
              {(() => {
                let idx = 0; // stagger 用の連番（バッチ進入のカスケード）
                return groups.map((g) => (
                  <Fragment key={g.key}>
                    <div className="timeline-divider">
                      <span className="timeline-divider-dot" aria-hidden />
                      <span className="timeline-divider-label font-display">{g.label}</span>
                    </div>
                    {g.posts.map((p) => (
                      <RecordCard
                        key={p.id}
                        post={p}
                        score={scores?.[p.id]}
                        revealDelayMs={(idx++ % 6) * 45}
                        onOpenDetail={onOpenDetail}
                      />
                    ))}
                  </Fragment>
                ));
              })()}
              {/* 無限スクロール sentinel（ALL のときだけ次ページを取りに行く） */}
              {hasMore && filter === "all" && (
                <div ref={sentinelRef} className="records-sentinel" aria-hidden>
                  {loadingMore && <span className="font-display">LOADING</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
