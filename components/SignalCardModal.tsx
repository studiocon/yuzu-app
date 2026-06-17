"use client";

import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type AnimState = "opening" | "open" | "closing";
const OPEN_MS = 320;
const CLOSE_MS = 280;

type Props = {
  streak: number;
  totalCount: number;
  onClose: () => void;
};

export default function SignalCardModal({ streak, totalCount, onClose }: Props) {
  const [animState, setAnimState] = useState<AnimState>("opening");
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const t = setTimeout(() => setAnimState("open"), OPEN_MS);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setAnimState("closing");
    setTimeout(onClose, CLOSE_MS);
  };

  const handleSave = async () => {
    const node = cardRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      if (document.fonts?.ready) await document.fonts.ready;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#000000",
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `yuzu-signal-day${streak}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yuzu-signal-day${streak}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("signal export failed", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="signal-overlay" data-anim={animState} role="dialog" aria-modal="true" aria-label="SIGNAL カード">
      <div className="signal-backdrop" onClick={handleClose} aria-hidden="true" />
      <div className="signal-sheet">
        <div ref={cardRef} className="signal-card">
          <p className="signal-label font-display">DAY {streak}</p>
          <p className="signal-sub font-display">VOICE {totalCount}</p>
          <p className="signal-brand font-display">YUZU</p>
        </div>
        <div className="signal-actions">
          <button
            type="button"
            className="signal-save-btn font-display"
            onClick={handleSave}
            disabled={exporting}
          >
            {exporting ? "SAVING" : "画像を保存"}
          </button>
          <button type="button" className="signal-close-btn" onClick={handleClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
