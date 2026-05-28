"use client";

import { useMemo, useState } from "react";
import SentimentChart from "./SentimentChart";
import { computeSentimentSeries, aggregateSentimentByWeek } from "@/lib/sentimentSeries";
import { buildDummySentiment } from "@/lib/dummySentiment";
import type { Post } from "@/lib/types";

type Mode = "month" | "all";

type Props = {
  posts: Post[];
  scores: Record<string, number>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function LongSentimentChart({ posts, scores }: Props) {
  const [mode, setMode] = useState<Mode>("month");

  const data = useMemo(() => {
    if (mode === "month") {
      const cutoff = Date.now() - 30 * DAY_MS;
      const filtered = posts.filter((p) => p.createdAt >= cutoff);
      return computeSentimentSeries(filtered, scores);
    }
    const series = computeSentimentSeries(posts, scores);
    return aggregateSentimentByWeek(series);
  }, [posts, scores, mode]);

  return (
    <section className="mypage-section">
      <header className="long-sentiment-header">
        <h3 className="mypage-section-title font-display">SENTIMENT</h3>
        <div className="section-filter" role="tablist" aria-label="期間切替">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "month"}
            className={"section-filter-item font-display" + (mode === "month" ? " is-active" : "")}
            onClick={() => setMode("month")}
          >
            MONTH
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "all"}
            className={"section-filter-item font-display" + (mode === "all" ? " is-active" : "")}
            onClick={() => setMode("all")}
          >
            ALL
          </button>
        </div>
      </header>
      <div className="mypage-chart-card">
        {data.length < 3 ? (
          <div className="sentiment-preview">
            <SentimentChart data={buildDummySentiment()} />
            <div className="sentiment-preview-overlay">
              <p className="sentiment-preview-label font-display">PREVIEW.</p>
              <p className="sentiment-preview-msg">RECORD すると、ここに見える</p>
            </div>
          </div>
        ) : (
          <SentimentChart data={data} />
        )}
      </div>
    </section>
  );
}
