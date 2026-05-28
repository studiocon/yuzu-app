"use client";

import { useMemo, useState } from "react";
import { buildHeatmap, type HeatmapCell } from "@/lib/heatmap";
import { useInsightData } from "@/lib/useInsightData";
import type { Post } from "@/lib/types";
import InsightFallback from "./InsightFallback";

const computeCells = (posts: Post[]) =>
  buildHeatmap(posts.map((p) => ({ text: p.text, createdAt: p.createdAt })));

const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const BUCKET_LABELS = [0, 1, 2, 3, 4, 5];
const DATE_LABEL_EVERY = 7;

function fmtDateLabel(date: string): string {
  // "YYYY-MM-DD" → "MM/DD"
  const [, m, d] = date.split("-");
  return `${m}/${d}`;
}

function fmtHour(h: number): string {
  return h.toString().padStart(2, "0");
}

export default function TimeHeatmap({ posts }: { posts: Post[] }) {
  const { data: cells, error } = useInsightData<HeatmapCell[]>({
    endpoint: "/api/insights/heatmap",
    posts,
    compute: computeCells,
    parse: (r) => (Array.isArray(r.cells) ? (r.cells as HeatmapCell[]) : []),
  });
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  const { maxChars, dates, hasAny } = useMemo(() => {
    if (!cells || cells.length === 0) {
      return { maxChars: 0, dates: [] as string[], hasAny: false };
    }
    let max = 0;
    let any = false;
    const dateSet = new Set<string>();
    for (const c of cells) {
      dateSet.add(c.date);
      if (c.charCount > max) max = c.charCount;
      if (c.charCount > 0) any = true;
    }
    return { maxChars: max, dates: [...dateSet], hasAny: any };
  }, [cells]);

  if (error) return <InsightFallback state="error" message={error} />;
  if (cells === null) return <InsightFallback state="loading" message="解読中" />;
  if (!hasAny) return <InsightFallback state="empty" message="まだ声がない" />;

  return (
    <div className="time-heatmap">
      <div className="time-heatmap-inner">
        {/* 時間軸ラベル（左）— 各バケット先頭時刻 00/04/08/12/16/20 */}
        {BUCKET_LABELS.map((b) => (
          <span
            key={`bucket-${b}`}
            className="time-heatmap-hour-label font-display"
            style={{ top: b * STEP }}
          >
            {fmtHour(b * 4)}
          </span>
        ))}

        {/* セルグリッド */}
        <div
          className="time-heatmap-grid"
          onMouseLeave={() => setHover(null)}
        >
          {cells.map((c) => {
            const dateIndex = dates.indexOf(c.date);
            const isEmpty = c.charCount === 0;
            const opacity = isEmpty ? 1 : 0.2 + (c.charCount / maxChars) * 0.8;
            return (
              <button
                key={`${c.date}-${c.bucket}`}
                type="button"
                className="time-heatmap-cell"
                aria-label={`${fmtDateLabel(c.date)} ${fmtHour(c.bucket * 4)}:00 ${c.charCount} chars`}
                style={{
                  gridColumn: dateIndex + 1,
                  gridRow: c.bucket + 1,
                  background: isEmpty ? "var(--divider)" : "var(--yuzu-yellow)",
                  opacity,
                }}
                onMouseEnter={() => setHover(c)}
                onFocus={() => setHover(c)}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </div>

        {/* 日付軸ラベル（下） */}
        {dates.map((date, i) =>
          i % DATE_LABEL_EVERY === 0 ? (
            <span
              key={`date-${date}`}
              className="time-heatmap-date-label font-display"
              style={{ left: i * STEP }}
            >
              {fmtDateLabel(date)}
            </span>
          ) : null,
        )}

        {/* Tooltip */}
        {hover && (
          <div
            className="time-heatmap-tooltip font-display"
            style={{
              left: dates.indexOf(hover.date) * STEP + CELL / 2,
              top: hover.bucket * STEP - 6,
            }}
          >
            {fmtDateLabel(hover.date)} {fmtHour(hover.bucket * 4)}:00 / {hover.charCount} CHARS
          </div>
        )}
      </div>
    </div>
  );
}
