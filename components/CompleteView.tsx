"use client";

import { useRef, useState } from "react";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";

type Props = { post: Post; posts: Post[]; onBack: () => void };

export default function CompleteView({ post, posts, onBack }: Props) {
  const { streak, week } = computeStreak(posts);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      if (document.fonts?.ready) await document.fonts.ready;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#FAFAF5",
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `yuzu-${post.index}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yuzu-${post.index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("export failed", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="complete-view">
      <div ref={cardRef} className="complete-shareable">
        <p className="complete-stamp font-display">RECORDED.</p>
        <p className="complete-index font-display">#{post.index}</p>
        <div className="complete-card">
          <p className="complete-text">{post.text}</p>
        </div>

        <div className="streak-block">
          <div className="streak-week" aria-hidden>
            {week.map((d, i) => (
              <div key={i} className="streak-day" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
                <span className="streak-day-label">{d.label}</span>
                <span className={"streak-day-check" + (d.done ? " done" : "") + (d.isToday ? " today" : "")}>
                  {d.done ? "✓" : (
                    <span className="streak-day-silence font-display">SILENCE.</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="streak-headline">
            <span className="streak-count font-display">{streak}</span>
            <span className="streak-unit font-display">STREAK</span>
          </p>
        </div>
      </div>

      <div className="complete-actions">
        <button
          type="button"
          className="complete-export-btn font-display"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "EXPORTING." : "画像で晒す"}
        </button>
        <button type="button" className="complete-back-btn" onClick={onBack}>
          戻る
        </button>
      </div>
    </section>
  );
}
