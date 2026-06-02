"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SentimentChart from "./SentimentChart";
import { computeSentimentSeries } from "@/lib/sentimentSeries";
import { buildDummySentiment } from "@/lib/dummySentiment";
import { DAY_MS } from "@/lib/period";
import type { Post } from "@/lib/types";

// MVP: 課金未導入のため ALL は常に非活性。課金導入時 (#65) は plan を見て分岐する。
type Mode = "month" | "all";

type Props = {
  posts: Post[];
  scores: Record<string, number>;
};

export default function EmotionChart({ posts, scores }: Props) {
  const [mode] = useState<Mode>("month");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const handleAllClick = () => {
    setTooltipOpen(true);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltipOpen(false), 1800);
  };

  const data = useMemo(() => {
    const cutoff = Date.now() - 30 * DAY_MS;
    const filtered = posts.filter((p) => p.createdAt >= cutoff);
    return computeSentimentSeries(filtered, scores);
  }, [posts, scores]);

  return (
    <section className="mypage-section">
      <header className="long-sentiment-header">
        <h3 className="mypage-section-title font-display">EMOTION</h3>
        <div className="section-filter" role="tablist" aria-label="期間切替">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "month"}
            className={"section-filter-item font-display" + (mode === "month" ? " is-active" : "")}
          >
            MONTH
          </button>
          <span className="section-filter-lock">
            <button
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              className="section-filter-item font-display is-locked"
              onClick={handleAllClick}
            >
              ALL
            </button>
            <span
              role="tooltip"
              className={"section-filter-tooltip font-display" + (tooltipOpen ? " is-open" : "")}
            >
              COMING SOON.
            </span>
          </span>
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
