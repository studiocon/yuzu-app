"use client";

import { useEffect, useMemo, useState } from "react";
import { hierarchy, pack, type HierarchyCircularNode } from "d3-hierarchy";
import { extractWordFrequencies } from "@/lib/wordAnalysis";
import { useInsightData } from "@/lib/useInsightData";
import type { Post } from "@/lib/types";
import InsightFallback from "./InsightFallback";

type WordFreq = { word: string; count: number };
type Datum = { word: string; count: number; value: number };

const computeWords = (posts: Post[]) =>
  extractWordFrequencies(posts.map((p) => p.text));

const VIEW = 320;
const PADDING = 6;
const LABEL_MIN_RADIUS = 18;

// 読み込み中はバブルの形に寄せたスケルトンを出す（パック計算前の固定レイアウト）
const SKELETON_DOTS = [
  { cx: 160, cy: 150, r: 68 },
  { cx: 96, cy: 205, r: 42 },
  { cx: 226, cy: 200, r: 40 },
  { cx: 240, cy: 108, r: 32 },
  { cx: 92, cy: 96, r: 28 },
  { cx: 168, cy: 248, r: 24 },
  { cx: 54, cy: 160, r: 20 },
];

export default function WordBubbleMap({ posts }: { posts: Post[] }) {
  const { data: words, error } = useInsightData<WordFreq[]>({
    endpoint: "/api/insights/words",
    posts,
    compute: computeWords,
    parse: (r) => (Array.isArray(r.words) ? (r.words as WordFreq[]) : []),
  });
  const [poppedAt, setPoppedAt] = useState<number | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  const nodes = useMemo(() => {
    if (!words || words.length === 0) return [];
    const root = hierarchy<{ children?: Datum[]; word?: string; count?: number; value?: number }>({
      children: words.map((w) => ({ word: w.word, count: w.count, value: w.count })),
    }).sum((d) => d.value ?? 0);
    pack<typeof root.data>().size([VIEW, VIEW]).padding(PADDING)(root);
    return (root.leaves() as HierarchyCircularNode<Datum>[]).filter((n) => n.r > 0);
  }, [words]);

  // 入場アニメ（bubbleIn）は初回だけ。残し続けると pop/ripple class が外れた時に
  // animation-name が切り替わって bubbleIn が再生 → scale 0 から再展開して点滅する。
  useEffect(() => {
    if (!words || hasEntered) return;
    // staggered delay (i * 50ms) の最大 + アニメ尺 480ms + バッファ
    const t = setTimeout(() => setHasEntered(true), 20 * 50 + 480 + 100);
    return () => clearTimeout(t);
  }, [words, hasEntered]);

  const opacityRange = useMemo(() => {
    if (nodes.length === 0) return { min: 1, max: 1 };
    const counts = nodes.map((n) => n.data.count);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [nodes]);

  if (error) return <InsightFallback state="error" message={error} />;
  if (words === null) {
    return (
      <svg
        className="word-bubble-map"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label="読み取り中"
        aria-busy="true"
      >
        {SKELETON_DOTS.map((d, i) => (
          <circle key={i} className="word-bubble-skeleton-dot" cx={d.cx} cy={d.cy} r={d.r} />
        ))}
      </svg>
    );
  }
  if (words.length === 0) return <InsightFallback state="empty" message="まだ声がない" />;

  return (
    <svg
      className="word-bubble-map"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-label="よく使うワード"
    >
      {nodes.map((n, i) => {
        const { min, max } = opacityRange;
        const t = max === min ? 1 : (n.data.count - min) / (max - min);
        const opacity = 0.3 + 0.7 * t;
        const fontSize = Math.min(n.r * 0.55, 22);
        const showLabel = n.r >= LABEL_MIN_RADIUS;

        // ── ボヨーン挙動：押されたバブルとの距離で delay と強度を決める ──
        let popClass = "";
        let popDelay = 0;
        if (poppedAt !== null) {
          if (poppedAt === i) {
            popClass = "word-bubble--pop";
          } else {
            const source = nodes[poppedAt];
            if (source) {
              const dist = Math.hypot(n.x - source.x, n.y - source.y);
              // 押されたバブルの半径 +n.r +少しのバッファ内 = "隣接" 判定
              if (dist < source.r + n.r + 24) {
                popClass = "word-bubble--ripple";
                popDelay = 40 + Math.round(dist * 0.6);
              }
            }
          }
        }

        return (
          <g
            key={`${n.data.word}-${i}`}
            transform={`translate(${n.x},${n.y})`}
          >
            <g
              className={`word-bubble ${!hasEntered ? "word-bubble--enter" : ""} ${popClass}`.replace(/\s+/g, " ").trim()}
              style={{
                // @ts-expect-error CSS custom property
                "--bubble-opacity": opacity,
                animationDelay: popClass ? `${popDelay}ms` : !hasEntered ? `${i * 50}ms` : undefined,
                opacity,
                cursor: "pointer",
              }}
              onClick={() => setPoppedAt(i)}
              onAnimationEnd={() => {
                if (poppedAt === i && popClass === "word-bubble--pop") {
                  setPoppedAt(null);
                }
              }}
            >
              <circle r={n.r} fill="var(--yuzu-yellow)" />
              {showLabel && (
                <text
                  className="font-display"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fill="var(--ink)"
                  style={{ pointerEvents: "none" }}
                >
                  {n.data.word}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
