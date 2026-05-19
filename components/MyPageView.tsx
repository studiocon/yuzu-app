"use client";

import { useEffect, useMemo, useState } from "react";
import SentimentChart, { SentimentPoint } from "./SentimentChart";
import ReportsSection from "./ReportsSection";
import AvatarMark from "./AvatarMark";
import type { Post } from "@/lib/types";
import {
  getNickname,
  loadSentimentCache,
  saveSentimentCache,
} from "@/lib/userClient";

type Props = {
  myEmoji: string;
  myPosts: Post[];
  mySessionId: string | null;
};

const dateKey = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const calcStreak = (posts: Post[]): number => {
  if (posts.length === 0) return 0;
  const days = new Set(posts.map((p) => dateKey(p.createdAt)));
  let streak = 0;
  const cur = new Date();
  while (days.has(dateKey(cur.getTime()))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
};

export default function MyPageView({ myEmoji, myPosts, mySessionId }: Props) {
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

  const sentimentData: SentimentPoint[] = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const p of myPosts) {
      if (!(p.id in cache)) continue;
      const d = dateKey(p.createdAt);
      const arr = byDate.get(d) ?? [];
      arr.push(cache[p.id]);
      byDate.set(d, arr);
    }
    return [...byDate.entries()]
      .map(([date, scores]) => ({ date, score: scores.reduce((s, v) => s + v, 0) / scores.length }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [myPosts, cache]);

  const streak = useMemo(() => calcStreak(myPosts), [myPosts]);
  const recordedDays = useMemo(
    () => new Set(myPosts.map((p) => dateKey(p.createdAt))).size,
    [myPosts],
  );
  // myPosts is newest-first; [0] = latest post, [last] = oldest (first ever)
  const latestIndex = myPosts.length > 0 ? myPosts[0].index : null;
  const firstPostAt = myPosts.length > 0 ? myPosts[myPosts.length - 1].createdAt : null;

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
          <span className="mypage-stat-value font-display">{recordedDays}</span>
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
          <span className="mypage-stat-value mypage-stat-value--index font-display">
            {latestIndex !== null ? `#${latestIndex}` : "—"}
          </span>
        </div>
      </div>

      {(sentimentData.length > 0 || analyzing) && (
        <section className="mypage-section">
          <h4 className="mypage-section-title font-display">SENTIMENT</h4>
          <div className="mypage-chart-card">
            <SentimentChart data={sentimentData} />
            {analyzing && <p className="mypage-loading-hint">DECODING.</p>}
          </div>
        </section>
      )}

      <ReportsSection mySessionId={mySessionId} firstPostAt={firstPostAt} />

    </section>
  );
}
