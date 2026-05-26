"use client";

import { useMemo, useState } from "react";
import SentimentChart from "./SentimentChart";
import { computeSentimentSeries, aggregateSentimentByWeek } from "@/lib/sentimentSeries";
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
        <div className="long-sentiment-toggle" role="tablist" aria-label="期間切替">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "month"}
            className={"long-sentiment-toggle-btn font-display" + (mode === "month" ? " active" : "")}
            onClick={() => setMode("month")}
          >
            MONTH
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "all"}
            className={"long-sentiment-toggle-btn font-display" + (mode === "all" ? " active" : "")}
            onClick={() => setMode("all")}
          >
            ALL
          </button>
        </div>
      </header>
      <div className="mypage-chart-card">
        {data.length < 3 ? (
          <p className="sentiment-empty">声が少ない</p>
        ) : (
          <SentimentChart data={data} />
        )}
      </div>
    </section>
  );
}
