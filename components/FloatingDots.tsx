"use client";

import { useMemo } from "react";
import type { Phase } from "@/lib/types";

type Dot = {
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
};

function makeDots(count: number): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      left: `${10 + Math.random() * 80}%`,
      top: `${15 + Math.random() * 70}%`,
      size: 6 + Math.round(Math.random() * 6),
      duration: `${(3 + Math.random() * 4).toFixed(2)}s`,
      delay: `${(Math.random() * 3).toFixed(2)}s`,
    });
  }
  return dots;
}

export default function FloatingDots({ phase, count = 10 }: { phase: Phase; count?: number }) {
  const dots = useMemo(() => makeDots(count), [count]);
  return (
    <div className="dots-layer" data-phase={phase} aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className="dot"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            // @ts-expect-error CSS custom properties
            "--dot-dur": d.duration,
            "--dot-delay": d.delay,
          }}
        />
      ))}
    </div>
  );
}
