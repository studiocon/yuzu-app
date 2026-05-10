"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SentimentPoint = { date: string; score: number };

type Props = { data: SentimentPoint[] };

export default function SentimentChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="sentiment-empty">
        まだ感情の揺らぎを描けない。<br />もう少し声を残してね。
      </p>
    );
  }

  return (
    <div className="sentiment-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--surface-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            stroke="var(--surface-border)"
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            stroke="var(--surface-border)"
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-card)",
              border: "1px solid var(--surface-border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--ink)",
            }}
            formatter={(v: number) => [v.toFixed(2), "感情スコア"]}
          />
          <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--yuzu-zest)"
            strokeWidth={2.5}
            dot={{ fill: "var(--yuzu-zest)", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--yuzu-zest)" }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
