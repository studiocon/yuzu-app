"use client";

import { useEffect, useState } from "react";
import ReportCard from "./ReportCard";
import LongSentimentChart from "./LongSentimentChart";
import WordBubbleMap from "./WordBubbleMap";
import type { Post } from "@/lib/types";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockMode } from "@/lib/mockReports";
import { loadSentimentCache, saveSentimentCache } from "@/lib/userClient";

type Props = {
  myPosts: Post[];
};

export default function ReadView({ myPosts }: Props) {
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setScores(loadSentimentCache());
  }, []);

  // ── 未分析 post のセンチメントスコアを取得（IndexView から移管） ──
  useEffect(() => {
    if (!hydrated || myPosts.length === 0 || isMockMode()) return;
    const unresolved = myPosts.filter((p) => !(p.id in scores));
    if (unresolved.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analyze-sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posts: unresolved.map((p) => ({ id: p.id, text: p.text, createdAt: p.createdAt })),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: { postId: string; score: number }[] };
        if (cancelled) return;
        const next = { ...scores };
        for (const r of data.results) next[r.postId] = r.score;
        setScores(next);
        saveSentimentCache(next);
      } catch {
        // silent: 次回再試行
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, myPosts]);

  useEffect(() => {
    if (!hydrated) return;
    if (isMockMode()) {
      setReports(buildMockReportMetas());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // cache: "no-store" を外してブラウザの HTTP キャッシュを活かす
        const res = await fetch("/api/reports?scope=all");
        if (!res.ok) {
          if (!cancelled) setReports([]);
          return;
        }
        const data = (await res.json()) as { reports?: ReportMeta[] };
        if (cancelled) return;
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        if (!cancelled) setError("失敗、話せ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <section className="read-view">
      <LongSentimentChart posts={myPosts} scores={scores} />

      <section className="mypage-section">
        <h3 className="mypage-section-title font-display">WORDS</h3>
        <WordBubbleMap posts={myPosts} />
      </section>

      <section className="mypage-section">
        <h3 className="mypage-section-title font-display">REPORTS</h3>
        {loading && (
          <div className="reports-index-list" aria-busy="true" aria-label="解読中">
            {[0, 1, 2].map((i) => (
              <div key={i} className="report-card-skeleton">
                <div className="skeleton-block skeleton-block--kind" />
                <div className="skeleton-block skeleton-block--label" />
                <div className="skeleton-block skeleton-block--headline" />
                <div className="skeleton-chips">
                  <div className="skeleton-chip" />
                  <div className="skeleton-chip" />
                  <div className="skeleton-chip" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && reports.length === 0 && !error && (
          <div className="reports-empty-state">
            <p className="reports-empty-headline font-display">NOTHING TO READ YET.</p>
            <p className="reports-empty-body">沈黙は記録されない、話せ</p>
          </div>
        )}
        {error && <p className="reports-empty">{error}</p>}
        {!loading && reports.length > 0 && (
          <div className="reports-index-list">
            {reports.map((meta) => (
              <ReportCard key={meta.periodKey} meta={meta} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
