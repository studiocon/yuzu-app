"use client";

import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import SentimentChart from "./SentimentChart";
import { loadSentimentCache } from "@/lib/userClient";
import { buildMockReport, isMockMode } from "@/lib/mockReports";
import type { Report } from "@/lib/reportTypes";
import { periodLabel } from "@/lib/period";
import { reportCacheKey } from "@/lib/storageKeys";

type Props = { periodKey: string };

type Status = "loading" | "ok" | "no_posts" | "in_progress" | "error";

// POST は生成完了を待たない（非同期化：app/api/reports/[periodKey]/route.ts 参照）。
// 202 が返ったら GET をポーリングして完了を待つ。maxDuration(60s) + バッファぶんは粘る。
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 30; // 3s * 30 = 90s

export default function ReportDetail({ periodKey }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (isMockMode()) {
      setStatus("loading");
      setReport(null);
      const mock = buildMockReport(periodKey);
      if (mock) { setReport(mock); setStatus("ok"); }
      else setStatus("no_posts");
      return;
    }

    // 1) sessionStorage に payload があれば即時描画（裏でリバリデートする）
    let hasCached = false;
    try {
      const raw = sessionStorage.getItem(reportCacheKey(periodKey));
      if (raw) {
        const parsed = JSON.parse(raw) as Report;
        if (parsed?.payload) {
          setReport(parsed);
          setStatus("ok");
          hasCached = true;
        }
      }
    } catch {
      // 壊れたキャッシュは無視
    }
    if (!hasCached) {
      setStatus("loading");
      setReport(null);
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // GET を1回叩き、report が取れたら適用して true を返す。202(pending)ならポーリング継続の合図で false。
    const tryFetchReport = async (): Promise<"ok" | "pending" | "not_generated" | "in_progress" | "error"> => {
      const getRes = await fetch(`/api/reports/${encodeURIComponent(periodKey)}`);
      if (getRes.status === 422) return "in_progress";
      if (getRes.status === 202) return "pending";
      if (getRes.ok) {
        const data = (await getRes.json()) as { report?: Report };
        if (!data.report) return "error";
        setReport(data.report);
        try {
          sessionStorage.setItem(reportCacheKey(periodKey), JSON.stringify(data.report));
        } catch {}
        return "ok";
      }
      if (getRes.status === 404) return "not_generated"; // 呼び出し側で POST を試すため区別
      return "error";
    };

    (async () => {
      try {
        // 1) まず GET（すでに生成済み or 進行中のジョブがあるか確認）
        const first = await tryFetchReport();
        if (cancelled) return;
        if (first === "ok") { setStatus("ok"); return; }
        if (first === "in_progress") { setStatus("in_progress"); return; }
        if (first === "error") { if (!hasCached) setStatus("error"); return; }
        if (first === "pending") {
          setStatus("loading");
        } else {
          // 未生成（404）→ POST で起動（202 を即返すだけなので待たない）
          const scores = loadSentimentCache();
          const postRes = await fetch(`/api/reports/${encodeURIComponent(periodKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scores }),
          });
          if (cancelled) return;
          if (postRes.status === 404) { setStatus("no_posts"); return; }
          if (postRes.status === 422) { setStatus("in_progress"); return; }
          if (postRes.ok) {
            const data = (await postRes.json()) as { report?: Report };
            if (data.report) {
              // すでにキャッシュ済みだった場合の即応答フォールバック
              setReport(data.report);
              setStatus("ok");
              try {
                sessionStorage.setItem(reportCacheKey(periodKey), JSON.stringify(data.report));
              } catch {}
              return;
            }
          } else if (!hasCached) {
            setStatus("error");
            return;
          }
          setStatus("loading");
        }

        // 2) ポーリング（生成完了 or 失敗 or 上限まで）
        for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
          if (cancelled) return;
          await sleep(POLL_INTERVAL_MS);
          if (cancelled) return;
          const result = await tryFetchReport();
          if (cancelled) return;
          if (result === "ok") { setStatus("ok"); return; }
          if (result === "error") { if (!hasCached) setStatus("error"); return; }
          // "pending" / "not_generated"（stale ジョブ後の一時的な 404）は継続
        }
        if (!hasCached) setStatus("error");
      } catch {
        if (cancelled) return;
        if (!hasCached) setStatus("error");
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
          <p className="report-detail-status-sub">AI が刻んでいる。画面を離れても、閉じても止まらない。</p>
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
            <h2 className="report-detail-h font-display">FACT</h2>
            <Paragraphs text={report.payload.fact} />
          </section>

          {report.payload.proof.length > 0 && (
            <section className="report-detail-block">
              <h2 className="report-detail-h font-display">PROOF</h2>
              <Paragraphs text={report.payload.proof} />
            </section>
          )}

          <section className="report-detail-block">
            <h2 className="report-detail-h font-display">SHADOW</h2>
            <Paragraphs text={report.payload.shadow} />
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

