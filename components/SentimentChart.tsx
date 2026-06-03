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

export type { SentimentPoint };

type Props = { data: SentimentPoint[] };

const POS_COLOR = "#E8A020"; // --yuzu-zest
const NEG_COLOR = "#6F84A6"; // --mood-low

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
  if (data.length === 0) {
    return (
      <div className="sentiment-chart-empty" role="status">
        <p className="sentiment-chart-empty-label font-display">SILENCE.</p>
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

  // 0 ラインで色を厳密に分けるため、正領域 / 負領域を別系列に展開して 2 本の Area で塗る。
  // SVG gradient (objectBoundingBox) は path の bbox 中央で色が割れるので、正のピーク内に
  // 紺が滲む現象が起きる。symmetric split で確実に上=オレンジ / 下=紺にする。
  const splitData = useMemo(
    () => data.map((d) => ({
      date: d.date,
      score: d.score,
      posScore: d.score > 0 ? d.score : 0,
      negScore: d.score < 0 ? d.score : 0,
    })),
    [data],
  );

  return (
    <div className="sentiment-chart-wrap" role="img" aria-label="感情スコア 7 日トレンド">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={splitData} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
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
            fill={POS_COLOR}
            fillOpacity={0.45}
            baseValue={0}
            tooltipType="none"
            isAnimationActive={true}
            animationDuration={500}
          />
          <Area
            type="monotone"
            dataKey="negScore"
            stroke="none"
            fill={NEG_COLOR}
            fillOpacity={0.45}
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
