"use client";

import Link from "next/link";
import type { ReportMeta } from "@/lib/reportTypes";
import { formatPeriodRange } from "@/lib/period";
import { sentimentColor, SENTIMENT_POS, SENTIMENT_NEG } from "@/lib/sentimentColor";

type Props = { meta: ReportMeta };

// 感情スコア系列をミニ sparkline の SVG パスに変換する。
// viewBox 0 0 100 72、zero=y36、振幅 30（score 1→y6 / -1→y66、上下 6px 余白）。
// EMOTION チャート（SentimentChart.tsx）と同じく、ゼロ線で正領域/負領域を分けて
// 別々に塗る（カーブから下端まで単純に一塗りすると、0 付近で振れるデータは
// ほぼ紺〜透明の領域しか見えずグレーがかって見えるため）。
const SPARK_H = 72;
const SPARK_ZERO = SPARK_H / 2;
const SPARK_AMP = SPARK_H / 2 - 6;

function buildSparkPaths(
  series: { score: number }[],
): { line: string; posArea: string; negArea: string } | null {
  if (series.length < 2) return null;
  const n = series.length;
  const ZERO = SPARK_ZERO;
  const AMP = SPARK_AMP;
  const xs = series.map((_, i) => (i / (n - 1)) * 100);
  const clamp = (s: number) => Math.max(-1, Math.min(1, s));
  const ys = series.map((p) => ZERO - clamp(p.score) * AMP);
  const posYs = series.map((p) => ZERO - Math.max(0, clamp(p.score)) * AMP);
  const negYs = series.map((p) => ZERO - Math.min(0, clamp(p.score)) * AMP);

  const toLine = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(2)},${v.toFixed(2)}`).join("");
  const toArea = (vals: number[]) => {
    const lastX = xs[xs.length - 1].toFixed(2);
    const body = vals.map((v, i) => `L${xs[i].toFixed(2)},${v.toFixed(2)}`).join("");
    return `M${xs[0].toFixed(2)},${ZERO}${body}L${lastX},${ZERO}Z`;
  };

  return { line: toLine(ys), posArea: toArea(posYs), negArea: toArea(negYs) };
}

export default function ReportCard({ meta }: Props) {
  const kindLabel = meta.kind === "week" ? "WEEK" : "MONTH";
  const span = formatPeriodRange(meta.rangeStart, meta.rangeEnd, meta.kind);

  const series = meta.payload?.sentimentSeries ?? [];
  const avg =
    series.length > 0 ? series.reduce((sum, p) => sum + p.score, 0) / series.length : undefined;
  const edgeColor = sentimentColor(avg);
  const spark = buildSparkPaths(series);
  const posGradId = `spark-pos-${meta.periodKey}`;
  const negGradId = `spark-neg-${meta.periodKey}`;

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
        <svg className="report-card-spark" viewBox={`0 0 100 ${SPARK_H}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            {/* 正領域: 上端=オレンジ濃 → ゼロ線へ向けて減衰（EMOTION チャートと同じ floor 付き） */}
            <linearGradient id={posGradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={SPARK_H}>
              <stop offset="0%" stopColor={SENTIMENT_POS} stopOpacity={0.62} />
              <stop offset="50%" stopColor={SENTIMENT_POS} stopOpacity={0.18} />
            </linearGradient>
            {/* 負領域: ゼロ線から減衰 → 下端=紺濃 */}
            <linearGradient id={negGradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={SPARK_H}>
              <stop offset="50%" stopColor={SENTIMENT_NEG} stopOpacity={0.18} />
              <stop offset="100%" stopColor={SENTIMENT_NEG} stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <path d={spark.posArea} fill={`url(#${posGradId})`} />
          <path d={spark.negArea} fill={`url(#${negGradId})`} />
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
