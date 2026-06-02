"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 48;
const MAX_BAR_HEIGHT = 240;
const MIN_BAR_HEIGHT = 4;

type Props = {
  analyser: AnalyserNode | null;
  active: boolean;
};

export default function Waveform({ analyser, active }: Props) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !analyser) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = "";
      });
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    // 周波数ビンを BAR_COUNT 個のバケットに分散させて画面いっぱいに広げる。
    // 低域に偏ると左寄りになるので、対数スケールで取って音楽イコライザ風の見え方に。
    const bins = analyser.frequencyBinCount;
    const sampleIndices = Array.from({ length: BAR_COUNT }, (_, i) => {
      const t = i / (BAR_COUNT - 1);
      return Math.min(bins - 1, Math.floor(Math.pow(t, 1.6) * bins));
    });

    const tick = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < BAR_COUNT; i++) {
        const v = data[sampleIndices[i]] ?? 0;
        // 弱い信号でも反応するよう sqrt スケールで持ち上げる
        const norm = Math.sqrt(v / 255);
        const h = MIN_BAR_HEIGHT + norm * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
        const bar = barsRef.current[i];
        if (bar) bar.style.height = `${h}px`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [analyser, active]);

  const liveDriven = active && !!analyser;

  return (
    <div className="waveform" aria-hidden>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className={"waveform-bar" + (liveDriven ? "" : " idle")}
          style={liveDriven ? undefined : { animationDelay: `${(i * 0.06).toFixed(2)}s` }}
        />
      ))}
    </div>
  );
}
