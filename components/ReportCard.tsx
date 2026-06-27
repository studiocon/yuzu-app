"use client";

import Link from "next/link";
import type { ReportMeta } from "@/lib/reportTypes";
import { formatPeriodRange } from "@/lib/period";
import { sentimentColor, SENTIMENT_POS, SENTIMENT_NEG } from "@/lib/sentimentColor";

type Props = { meta: ReportMeta };

// 感情スコア系列をミニ sparkline の SVG パスに変換する。
// viewBox 0 0 100 28、zero=y14、振幅 12（score 1→y2 / -1→y26）。
function buildSparkPaths(series: { score: number }[]): { line: string; area: string } | null {
  if (series.length < 2) return null;
  const n = series.length;
  const x = (i: number) => (i / (n - 1)) * 100;
  const y = (s: number) => 14 - Math.max(-1, Math.min(1, s)) * 12;
  let line = "";
  for (let i = 0; i < n; i++) {
    line += `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(series[i].score).toFixed(2)}`;
  }
  const area = `${line}L100,28L0,28Z`;
  return { line, area };
}

export default function ReportCard({ meta }: Props) {
  const kindLabel = meta.kind === "week" ? "WEEK" : "MONTH";
  const span = formatPeriodRange(meta.rangeStart, meta.rangeEnd, meta.kind);

  const series = meta.payload?.sentimentSeries ?? [];
  const avg =
    series.length > 0 ? series.reduce((sum, p) => sum + p.score, 0) / series.length : undefined;
  const edgeColor = sentimentColor(avg);
  const spark = buildSparkPaths(series);
  const gradId = `spark-${meta.periodKey}`;

  return (
    <Link href={`/reports/${meta.periodKey}`} className="report-card" data-kind={meta.kind}>
      {edgeColor && (
        <span className="report-card-edge" style={{ background: edgeColor }} aria-hidden />
      )}
      <div className="report-card-head">
        <span className="report-card-kind font-display">{kindLabel}</span>
        <span className="report-card-span font-display">{span}</span>
      </div>
      {meta.headline && <p className="report-card-headline">{meta.headline}</p>}
      {meta.topics && meta.topics.length > 0 && (
        <div className="report-card-topics">
          {meta.topics.slice(0, 3).map((t, i) => (
            <span key={i} className="report-chip">{t}</span>
          ))}
        </div>
      )}
      {spark && (
        <svg className="report-card-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="28">
              <stop offset="0%" stopColor={SENTIMENT_POS} stopOpacity={0.5} />
              <stop offset="50%" stopColor={SENTIMENT_POS} stopOpacity={0.06} />
              <stop offset="50%" stopColor={SENTIMENT_NEG} stopOpacity={0.06} />
              <stop offset="100%" stopColor={SENTIMENT_NEG} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <path d={spark.area} fill={`url(#${gradId})`} />
          <path d={spark.line} fill="none" stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {!meta.generated && (
        <div className="report-card-pending font-display">
          {meta.postCount}{" "}RECORDS · TAP TO READ
        </div>
      )}
    </Link>
  );
}
