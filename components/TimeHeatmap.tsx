"use client";

import { useEffect, useMemo, useState } from "react";
import { isMockMode } from "@/lib/mockReports";
import { buildHeatmap, type HeatmapCell } from "@/lib/heatmap";
import type { Post } from "@/lib/types";

const DAYS = 30;
const HOURS = 24;
const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const HOUR_LABELS = [0, 6, 12, 18, 23];
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
  const [cells, setCells] = useState<HeatmapCell[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    if (isMockMode()) {
      setCells(buildHeatmap(posts.map((p) => ({ text: p.text, createdAt: p.createdAt }))));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/insights/heatmap");
        if (!res.ok) {
          if (!cancelled) setError("失敗、話せ");
          return;
        }
        const data = (await res.json()) as { cells?: HeatmapCell[] };
        if (cancelled) return;
        setCells(Array.isArray(data.cells) ? data.cells : []);
      } catch (e) {
        console.error("TimeHeatmap fetch:", e);
        if (!cancelled) setError("失敗、話せ");
      }
    })();
    return () => { cancelled = true; };
  }, [posts]);

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

  if (error) return <p className="reports-empty-body">{error}</p>;
  if (cells === null) return <p className="reports-empty-body" aria-busy="true">解読中</p>;
  if (!hasAny) return <p className="reports-empty-body">まだ声がない</p>;

  return (
    <div className="time-heatmap">
      <div className="time-heatmap-inner">
        {/* 時間軸ラベル（左） */}
        {HOUR_LABELS.map((h) => (
          <span
            key={`hour-${h}`}
            className="time-heatmap-hour-label font-display"
            style={{ top: h * STEP }}
          >
            {fmtHour(h)}
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
                key={`${c.date}-${c.hour}`}
                type="button"
                className="time-heatmap-cell"
                aria-label={`${fmtDateLabel(c.date)} ${fmtHour(c.hour)}:00 ${c.charCount} chars`}
                style={{
                  gridColumn: dateIndex + 1,
                  gridRow: c.hour + 1,
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
              top: hover.hour * STEP - 6,
            }}
          >
            {fmtDateLabel(hover.date)} {fmtHour(hover.hour)}:00 / {hover.charCount} CHARS
          </div>
        )}
      </div>
    </div>
  );
}
