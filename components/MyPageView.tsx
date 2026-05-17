"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import SentimentChart, { SentimentPoint } from "./SentimentChart";
import ReportsSection from "./ReportsSection";
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
  const [nickname, setNicknameState] = useState("ゲスト");
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

  return (
    <section className="mypage-view">
      <div className="mypage-profile">
        <div className="mypage-avatar" aria-hidden>{myEmoji}</div>
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
      </div>

      <section className="mypage-section">
        <h4 className="mypage-section-title font-display">SENTIMENT</h4>
        <div className="mypage-chart-card">
          <SentimentChart data={sentimentData} />
          {analyzing && <p className="mypage-loading-hint">DECODING…</p>}
        </div>
      </section>

      <ReportsSection mySessionId={mySessionId} />

      <section className="mypage-section">
        <h4 className="mypage-section-title font-display">RECORDS</h4>
        <div className="mypage-post-list">
          {myPosts.length === 0 && (
            <p className="mypage-empty">何も無い。話せ。</p>
          )}
          {myPosts.map((p) => (
            <article key={p.id} className="post-card mypage-post-card">
              <div className="post-header">
                <div className="post-emoji" aria-hidden>{p.emoji ?? myEmoji}</div>
                <span className="post-name">{nickname}</span>
                <time className="post-time">{formatTimeLabel(p.createdAt)}</time>
                <CopyButton text={p.text} />
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
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
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      className={"post-copy-btn" + (copied ? " is-copied" : "")}
      onClick={onClick}
      aria-label={copied ? "コピーしました" : "テキストをコピー"}
      title={copied ? "コピーしました" : "テキストをコピー"}
    >
      {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="regular" />}
    </button>
  );
}
