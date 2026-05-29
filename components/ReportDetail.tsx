"use client";

import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import SentimentChart from "./SentimentChart";
import { loadSentimentCache } from "@/lib/userClient";
import { buildMockReport, isMockMode } from "@/lib/mockReports";
import type { Report } from "@/lib/reportTypes";
import { periodLabel } from "@/lib/period";

type Props = { periodKey: string };

type Status = "loading" | "ok" | "no_posts" | "in_progress" | "error";

export default function ReportDetail({ periodKey }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setReport(null);
    if (isMockMode()) {
      const mock = buildMockReport(periodKey);
      if (mock) { setReport(mock); setStatus("ok"); }
      else setStatus("no_posts");
      return;
    }
    (async () => {
      try {
        const scores = loadSentimentCache();
        // GET ファースト: サーバ側でキャッシュ済みなら即返る。ブラウザの HTTP キャッシュも効く。
        const scoresParam = Object.entries(scores)
          .map(([id, s]) => `${id}:${s}`)
          .join(",");
        const qs = scoresParam ? `?scores=${encodeURIComponent(scoresParam)}` : "";
        const res = await fetch(`/api/reports/${encodeURIComponent(periodKey)}${qs}`);
        if (cancelled) return;
        if (res.status === 404) { setStatus("no_posts"); return; }
        if (res.status === 422) { setStatus("in_progress"); return; }
        if (!res.ok) { setStatus("error"); return; }
        const data = (await res.json()) as { report?: Report };
        if (!data.report) { setStatus("error"); return; }
        setReport(data.report);
        setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [periodKey, retryNonce]);

  return (
    <main className="report-detail-page">
      <PageHeader backHref="/reports" backLabel="REPORTS" />

      {status === "loading" && (
        <div className="report-detail-skeleton" aria-busy="true" aria-label="読み取り中">
          <div className="skeleton-block skeleton-block--title" />
          <div className="skeleton-block skeleton-block--headline" />
          <div className="skeleton-block skeleton-block--chart" />
          <div className="skeleton-block skeleton-block--line" />
          <div className="skeleton-block skeleton-block--line" />
          <div className="skeleton-block skeleton-block--line skeleton-block--line-short" />
          <div className="skeleton-block skeleton-block--line" />
          <div className="skeleton-block skeleton-block--line" />
          <p className="report-detail-status-sub">AIが分析中。他の画面に移動したり閉じても生成は続きます。</p>
        </div>
      )}
      {status === "no_posts" && (
        <p className="report-detail-status">この期間は何も無い</p>
      )}
      {status === "in_progress" && (
        <p className="report-detail-status">まだ進行中の期間だ</p>
      )}
      {status === "error" && (
        <div className="report-detail-status">
          <p>失敗、話せ</p>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setRetryNonce((n) => n + 1)}
          >
            RETRY
          </button>
        </div>
      )}

      {status === "ok" && report && (
        <article className="report-detail">
          <header className="report-detail-titleblock">
            <h1 className="report-detail-title font-display">{periodLabel(periodKey)}</h1>
            <p className="report-detail-headline">{report.payload.headline}</p>
          </header>

          <section className="report-detail-block">
            <h2 className="report-detail-h font-display">EMOTION</h2>
            <div className="mypage-chart-card">
              <SentimentChart data={report.payload.sentimentSeries} />
            </div>
          </section>

          {report.payload.topics.length > 0 && (
            <section className="report-detail-block">
              <h2 className="report-detail-h font-display">TOPICS</h2>
              <div className="report-detail-topics">
                {report.payload.topics.map((t, i) => (
                  <span key={i} className="report-chip">{t}</span>
                ))}
              </div>
            </section>
          )}

          <section className="report-detail-block">
            <h2 className="report-detail-h font-display">SURFACE</h2>
            <Paragraphs text={report.payload.manifest} />
          </section>

          <section className="report-detail-block">
            <h2 className="report-detail-h font-display">DEPTH</h2>
            <Paragraphs text={report.payload.latent} />
          </section>

          <section className="report-detail-block is-advice">
            <h2 className="report-detail-h font-display">ADVICE</h2>
            <p className="report-detail-advice font-display">{report.payload.advice}</p>
            {report.payload.adviceDetail && (
              <div className="report-detail-advice-detail">
                <Paragraphs text={report.payload.adviceDetail} />
              </div>
            )}
          </section>
        </article>
      )}
    </main>
  );
}

function Paragraphs({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => (
        <p key={i} className="report-detail-text">{b}</p>
      ))}
    </>
  );
}

