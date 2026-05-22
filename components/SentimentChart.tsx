"use client";

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
const NEG_COLOR = "#1A1A2E"; // --ink

function scoreLabel(score: number): string {
  if (score >= 0.5) return "ポジティブ";
  if (score >= 0.15) return "ややポジティブ";
  if (score > -0.15) return "穏やか";
  if (score > -0.5) return "ややネガティブ";
  return "ネガティブ";
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
  if (data.length < 3) return null;

  const DateTick = makeDateTick(data.map((d) => d.date));

  return (
    <div className="sentiment-chart-wrap" role="img" aria-label="感情スコア 7 日トレンド">
      <svg
        width="1"
        height="1"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        aria-hidden
      >
        <defs>
          <linearGradient id="sentiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POS_COLOR} stopOpacity={0.9} />
            <stop offset="50%" stopColor={POS_COLOR} stopOpacity={0.15} />
            <stop offset="50%" stopColor={NEG_COLOR} stopOpacity={0.15} />
            <stop offset="100%" stopColor={NEG_COLOR} stopOpacity={0.9} />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 16, left: 0 }}>
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
            formatter={(v: number) => [scoreLabel(v), "気分"]}
          />
          <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="score"
            stroke="none"
            fill="url(#sentiGrad)"
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
