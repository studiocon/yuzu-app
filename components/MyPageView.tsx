"use client";

import { useEffect, useMemo, useState } from "react";
import SentimentChart from "./SentimentChart";
import ReportsSection from "./ReportsSection";
import AvatarMark from "./AvatarMark";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";
import { computeSentimentSeries } from "@/lib/sentimentSeries";
import {
  getNickname,
  loadSentimentCache,
  saveSentimentCache,
} from "@/lib/userClient";

type Props = {
  myEmoji: string;
  myPosts: Post[];
  onOpenDetail?: (post: Post) => void;
};

export default function MyPageView({ myEmoji, myPosts, onOpenDetail }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [nickname, setNicknameState] = useState("GUEST");
  const [cache, setCache] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setNicknameState(getNickname(myEmoji));
    setCache(loadSentimentCache());
    setHydrated(true);
  }, [myEmoji]);

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

  const streak = useMemo(() => computeStreak(myPosts).streak, [myPosts]);
  // myPosts is newest-first; [0] = latest post, [last] = oldest (first ever)
  const latestIndex = myPosts.length > 0 ? myPosts[0].index : null;
  const firstPostAt = myPosts.length > 0 ? myPosts[myPosts.length - 1].createdAt : null;
  const daysSinceStart = useMemo(() => {
    if (firstPostAt === null) return 0;
    const start = new Date(firstPostAt);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.floor((today - startDay) / 86400000) + 1;
  }, [firstPostAt]);

  return (
    <section className="mypage-view">
      <div className="mypage-profile">
        <AvatarMark emoji={myEmoji} size="lg" />
        <div className="mypage-nickname-row">
          <h3 className="mypage-nickname font-display">{nickname}</h3>
        </div>
      </div>

      <div className="mypage-stats">
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">DAY</span>
          <span className="mypage-stat-value font-display">{daysSinceStart}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">RECORDS</span>
          <span className="mypage-stat-value font-display">{myPosts.length}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">STREAK</span>
          <span className="mypage-stat-value font-display">{streak}</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-label font-display">LATEST</span>
          {latestIndex !== null && onOpenDetail ? (
            <button
              type="button"
              className="mypage-stat-value mypage-stat-value--index mypage-stat-value--btn font-display"
              onClick={() => onOpenDetail(myPosts[0])}
              aria-label={`#${latestIndex} を開く`}
            >
              {`#${latestIndex}`}
            </button>
          ) : (
            <span className="mypage-stat-value mypage-stat-value--index font-display">
              {latestIndex !== null ? `#${latestIndex}` : "—"}
            </span>
          )}
        </div>
      </div>

      {(sentimentData.length > 0 || analyzing) && (
        <section className="mypage-section">
          <h4 className="mypage-section-title font-display">SENTIMENT</h4>
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

      <ReportsSection firstPostAt={firstPostAt} />

    </section>
  );
}
