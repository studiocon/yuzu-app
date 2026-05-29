"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** カウントアップの所要時間（ms）。既定 1000。 */
  durationMs?: number;
  /** 開始までの遅延（ms）。入場アニメの後に走らせたいとき。既定 0。 */
  delayMs?: number;
};

/**
 * 0 → target を ease-out でカウントアップし、丸めた現在値を返す。
 * STATS（MINUTES / STREAK）の達成感演出用。
 * - `prefers-reduced-motion: reduce` のときは即 target を返す（アニメなし）。
 * - rAF は cleanup で必ず cancel する（Waveform.tsx の rAF パターンに倣う）。
 */
export function useCountUp(target: number, { durationMs = 1000, delayMs = 0 }: Options = {}): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || safeTarget <= 0) {
      setValue(safeTarget);
      return;
    }

    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(safeTarget * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    setValue(0);
    timerRef.current = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
