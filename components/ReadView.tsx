"use client";

import { useEffect, useState } from "react";
import ReportCard from "./ReportCard";
import LongSentimentChart from "./LongSentimentChart";
import type { Post } from "@/lib/types";
import type { ReportMeta } from "@/lib/reportTypes";
import { buildMockReportMetas, isMockMode } from "@/lib/mockReports";
import { loadSentimentCache } from "@/lib/userClient";

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
        const res = await fetch("/api/reports?scope=all", { cache: "no-store" });
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
      <h2 className="read-view-title font-display">READ.</h2>

      <LongSentimentChart posts={myPosts} scores={scores} />

      <section className="mypage-section">
        <h3 className="mypage-section-title font-display">REPORTS</h3>
        {loading && <p className="reports-empty">DECODING.</p>}
        {!loading && reports.length === 0 && !error && (
          <div className="reports-empty-state">
            <p className="reports-empty-headline font-display">NOTHING TO READ YET.</p>
            <p className="reports-empty-body">沈黙は記録されない、話せ</p>
          </div>
        )}
        {error && <p className="reports-empty">{error}</p>}
        {reports.length > 0 && (
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
