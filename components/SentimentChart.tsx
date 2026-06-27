"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WEEKDAY_JA } from "@/lib/streak";
import type { SentimentPoint } from "@/lib/sentimentSeries";
import { SENTIMENT_POS, SENTIMENT_NEG } from "@/lib/sentimentColor";

export type { SentimentPoint };

type Props = { data: SentimentPoint[] };

// LOG のカード左端バーと同じ感情スケールの端点を共有（紺 → オレンジ）。
const POS_COLOR = SENTIMENT_POS; // +1.0 端点 = --yuzu-zest
const NEG_COLOR = SENTIMENT_NEG; // -1.0 端点 = --mood-low（紺）
// .sentiment-chart-wrap は height:220px 固定。ComposedChart margin top:12 / bottom:16。
// → 上端(score=+1)=y12, ゼロ線=y108, 下端(score=-1)=y204。userSpaceOnUse でこの
//   y 座標にグラデの色止めを置くと、objectBoundingBox のような bbox 中央割れが起きない。
const CHART_H = 220;
const ZERO_OFFSET = `${((108 / CHART_H) * 100).toFixed(1)}%`;

// Mirror 原則: 感情を judging せず、状態を描写する短い言葉だけ返す。
// 「ポジティブ／ネガティブ」のような評価語は使わない。
function scoreLabel(score: number): string {
  if (score >= 0.5) return "高い";
  if (score >= 0.15) return "上向き";
  if (score > -0.15) return "凪";
  if (score > -0.5) return "下向き";
  return "低い";
}

function makeDateTick(dates: string[]) {
  return function DateTick({ x, y, payload, index }: { x?: number; y?: number; payload?: { value: string }; index?: number }) {
    const dateStr = payload?.value ?? "";
    const [, m, d] = dateStr.split("-");
    const prevMonth = (index ?? 0) > 0 ? dates[(index ?? 0) - 1].split("-")[1] : null;
    const showMonth = (index ?? 0) === 0 || m !== prevMonth;
    const label = showMonth ? `${Number(m)}/${Number(d)}` : `${Number(d)}`;
    const dow = WEEKDAY_JA[new Date(dateStr).getDay()];
    return (
      <g transform={`translate(${x ?? 0},${y ?? 0})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--ink-muted)" fontSize={11}>{label}</text>
        <text x={0} y={0} dy={25} textAnchor="middle" fill="var(--ink-muted)" fontSize={10}>{dow}</text>
      </g>
    );
  };
}

export default function SentimentChart({ data }: Props) {
  // 0 ラインで色を厳密に分けるため、正領域 / 負領域を別系列に展開して 2 本の Area で塗る。
  // SVG gradient (objectBoundingBox) は path の bbox 中央で色が割れるので、正のピーク内に
  // 紺が滲む現象が起きる。symmetric split で確実に上=オレンジ / 下=紺にする。
  // Hooks は early return より前に呼ぶ（rules-of-hooks）。
  const splitData = useMemo(
    () => data.map((d) => ({
      date: d.date,
      score: d.score,
      posScore: d.score > 0 ? d.score : 0,
      negScore: d.score < 0 ? d.score : 0,
    })),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="sentiment-chart-empty" role="status">
        <p className="sentiment-chart-empty-label font-display">SILENCE</p>
        <p className="sentiment-chart-empty-msg">声紋が無い</p>
      </div>
    );
  }
  if (data.length < 2) {
    return (
      <div className="sentiment-chart-empty" role="status">
        <p className="sentiment-chart-empty-label font-display">SPARSE.</p>
        <p className="sentiment-chart-empty-msg">声紋が 1 日分のみ、続けろ</p>
      </div>
    );
  }

  const DateTick = makeDateTick(data.map((d) => d.date));

  return (
    <div className="sentiment-chart-wrap" role="img" aria-label="感情スコア 7 日トレンド">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={splitData} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
          <defs>
            {/* 正領域: 上端=オレンジ濃 → ゼロ線へ向けて減衰（弱い感情でも見える floor 付き） */}
            <linearGradient id="sentGradPos" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={CHART_H}>
              <stop offset="0%" stopColor={POS_COLOR} stopOpacity={0.62} />
              <stop offset={ZERO_OFFSET} stopColor={POS_COLOR} stopOpacity={0.18} />
            </linearGradient>
            {/* 負領域: ゼロ線から減衰 → 下端=紺濃 */}
            <linearGradient id="sentGradNeg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={CHART_H}>
              <stop offset={ZERO_OFFSET} stopColor={NEG_COLOR} stopOpacity={0.18} />
              <stop offset="100%" stopColor={NEG_COLOR} stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={DateTick}
            stroke="var(--surface-border)"
            height={44}
          />
          <YAxis domain={[-1, 1]} hide />
          <Tooltip
            contentStyle={{
              background: "var(--surface-card)",
              border: "1px solid var(--surface-border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--ink)",
            }}
            formatter={(v: number, name: string) =>
              name === "score" ? [scoreLabel(v), "気分"] : null
            }
          />
          <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="posScore"
            stroke="none"
            fill="url(#sentGradPos)"
            fillOpacity={1}
            baseValue={0}
            tooltipType="none"
            isAnimationActive={true}
            animationDuration={500}
          />
          <Area
            type="monotone"
            dataKey="negScore"
            stroke="none"
            fill="url(#sentGradNeg)"
            fillOpacity={1}
            baseValue={0}
            tooltipType="none"
            isAnimationActive={true}
            animationDuration={500}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--ink)"
            strokeOpacity={0.3}
            strokeWidth={1.5}
            dot={{ fill: "var(--ink)", fillOpacity: 0.5, r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--ink)" }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
