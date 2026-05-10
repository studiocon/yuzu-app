"use client";

import { useEffect, useMemo, useState } from "react";
import SentimentChart, { SentimentPoint } from "./SentimentChart";
import { type Post } from "./TimelineView";
import {
  getDaysSinceRegistered,
  getNickname,
  loadSentimentCache,
  saveSentimentCache,
  setNickname as persistNickname,
} from "@/lib/userClient";

type MyPost = Post & { sessionId?: string };

type Props = {
  myEmoji: string;
  posts: MyPost[];
  mySessionId: string | null;
};

const dateKey = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatTimeLabel = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const calcStreak = (posts: MyPost[]): number => {
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

const formatSpoken = (count: number): string => {
  const minutes = Math.round((count * 30) / 60);
  return minutes <= 0 ? "1分未満" : `約${minutes}分`;
};

export default function MyPageView({ myEmoji, posts, mySessionId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [nickname, setNicknameState] = useState("ゲスト");
  const [days, setDays] = useState(1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [cache, setCache] = useState<Record<string, number>>({});
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setNicknameState(getNickname(myEmoji));
    setDays(getDaysSinceRegistered());
    setCache(loadSentimentCache());
    setHydrated(true);
  }, [myEmoji]);

  const myPosts = useMemo<MyPost[]>(() => {
    if (!mySessionId) return [];
    return posts.filter((p) => p.sessionId === mySessionId);
  }, [posts, mySessionId]);

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

  const totalChars = useMemo(
    () => myPosts.reduce((s, p) => s + (p.text?.length ?? 0), 0),
    [myPosts]
  );
  const streak = useMemo(() => calcStreak(myPosts), [myPosts]);

  const startEdit = () => { setDraft(nickname); setEditing(true); };
  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      persistNickname(trimmed);
      setNicknameState(trimmed);
    }
    setEditing(false);
  };

  return (
    <section className="mypage-view">
      <h2 className="mypage-title font-display">
        <span aria-hidden>{myEmoji}</span> わたしの畑
      </h2>

      <div className="mypage-profile">
        <div className="mypage-avatar" aria-hidden>{myEmoji}</div>
        <div className="mypage-nickname-row">
          {editing ? (
            <>
              <input
                className="mypage-nickname-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
                maxLength={20}
              />
              <button type="button" className="mypage-edit-btn" onClick={commitEdit}>保存</button>
            </>
          ) : (
            <>
              <h3 className="mypage-nickname font-display">{nickname}</h3>
              <button type="button" className="mypage-edit-btn" onClick={startEdit}>編集</button>
            </>
          )}
        </div>
      </div>

      <div className="mypage-stats">
        <div className="mypage-stat-card">
          <span className="mypage-stat-icon">🌱</span>
          <span className="mypage-stat-value">{days}</span>
          <span className="mypage-stat-label">日目</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-icon">🎤</span>
          <span className="mypage-stat-value">{myPosts.length}</span>
          <span className="mypage-stat-label">つぶやき</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-icon">⏱️</span>
          <span className="mypage-stat-value">{formatSpoken(myPosts.length)}</span>
          <span className="mypage-stat-label">はなした</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-icon">📝</span>
          <span className="mypage-stat-value">{totalChars}</span>
          <span className="mypage-stat-label">総文字</span>
        </div>
        <div className="mypage-stat-card">
          <span className="mypage-stat-icon">🔥</span>
          <span className="mypage-stat-value">{streak}</span>
          <span className="mypage-stat-label">連続日</span>
        </div>
      </div>

      <section className="mypage-section">
        <h4 className="mypage-section-title">こころの揺らぎ</h4>
        <div className="mypage-chart-card">
          <SentimentChart data={sentimentData} />
          {analyzing && <p className="mypage-loading-hint">声の色を読みとってる…</p>}
        </div>
      </section>

      <section className="mypage-section">
        <h4 className="mypage-section-title">わたしのつぶやき</h4>
        <div className="mypage-post-list">
          {myPosts.length === 0 && (
            <p className="mypage-empty">まだ畑は空っぽ。<br />最初の声を植えよう。</p>
          )}
          {myPosts.map((p) => (
            <article key={p.id} className="post-card mypage-post-card">
              <div className="post-header">
                <div className="post-emoji" aria-hidden>{p.emoji ?? myEmoji}</div>
                <span className="post-name">{nickname}</span>
                <time className="post-time">{formatTimeLabel(p.createdAt)}</time>
              </div>
              <div className="post-body">
                <p className="post-text">{p.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
