"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Microphone, X } from "@phosphor-icons/react";
import SpeakView from "./SpeakView";
import type { Post } from "@/lib/types";
import { computeStreak } from "@/lib/streak";

type Phase = "idle" | "recording" | "busy" | "complete";
type AnimState = "measuring" | "opening" | "open" | "closing";

const OPEN_MS = 480;
const CLOSE_MS = 420;

type Props = {
  open: boolean;
  onClose: () => void;
  phase: Phase;
  shortTap: boolean;
  statusMsg: string | null;
  error: string | null;
  hint: string | null;
  analyser: AnalyserNode | null;
  lastPost: Post | null;
  posts: Post[];
  myEmoji: string;
  onPressStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onPressEnd: () => void;
  onPressCancel: () => void;
};

export default function RecordModal({
  open,
  onClose,
  phase,
  shortTap,
  statusMsg,
  error,
  hint,
  analyser,
  lastPost,
  posts,
  myEmoji,
  onPressStart,
  onPressEnd,
  onPressCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("measuring");
  const [flyVars, setFlyVars] = useState<React.CSSProperties>({});
  const flyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setAnimState("measuring");
    } else if (mounted) {
      // Re-measure before closing in case the fly target moved
      computeFlyVars();
      setAnimState("closing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const computeFlyVars = () => {
    const fly = flyRef.current;
    const fab = document.querySelector<HTMLElement>(".mic-fab");
    if (!fly || !fab) return;
    const flyRect = fly.getBoundingClientRect();
    const fabRect = fab.getBoundingClientRect();
    if (flyRect.width === 0) return;
    const flyCx = flyRect.left + flyRect.width / 2;
    const flyCy = flyRect.top + flyRect.height / 2;
    const fabCx = fabRect.left + fabRect.width / 2;
    const fabCy = fabRect.top + fabRect.height / 2;
    setFlyVars({
      "--fly-dx": `${fabCx - flyCx}px`,
      "--fly-dy": `${fabCy - flyCy}px`,
      "--fly-scale": `${fabRect.width / flyRect.width}`,
    } as React.CSSProperties);
  };

  useLayoutEffect(() => {
    if (animState !== "measuring") return;
    computeFlyVars();
    setAnimState("opening");
  }, [animState]);

  useEffect(() => {
    if (animState === "opening") {
      const t = setTimeout(() => setAnimState("open"), OPEN_MS);
      return () => clearTimeout(t);
    }
    if (animState === "closing") {
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [animState]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted) return null;

  const canClose = phase === "idle" || phase === "complete";
  const isComplete = phase === "complete";

  return (
    <div className="record-modal" data-anim={animState} data-phase={phase} style={flyVars}>
      <div className="rm-flash" aria-hidden />

      <div className="rm-fly-mic" aria-hidden ref={flyRef}>
        <Microphone size={40} weight="fill" />
      </div>

      <button
        type="button"
        className="record-modal-close"
        aria-label="閉じる"
        onClick={onClose}
        disabled={!canClose}
      >
        <X size={22} weight="bold" />
      </button>

      {isComplete && lastPost ? (
        <CompleteView post={lastPost} posts={posts} onBack={onClose} />
      ) : (
        <SpeakView
          phase={phase}
          shortTap={shortTap}
          statusMsg={statusMsg}
          error={error}
          hint={hint}
          analyser={analyser}
          onPressStart={onPressStart}
          onPressEnd={onPressEnd}
          onPressCancel={onPressCancel}
        />
      )}
    </div>
  );
}

function CompleteView({ post, posts, onBack }: { post: Post; posts: Post[]; onBack: () => void }) {
  const { streak, week } = computeStreak(posts);
  return (
    <section className="complete-view">
      <div className="complete-card">
        <p className="complete-text">{post.text}</p>
      </div>

      <div className="streak-block">
        <div className="streak-week" aria-hidden>
          {week.map((d, i) => (
            <div key={i} className="streak-day" style={{ animationDelay: `${0.6 + i * 0.08}s` }}>
              <span className="streak-day-label">{d.label}</span>
              <span className={"streak-day-check" + (d.done ? " done" : "") + (d.isToday ? " today" : "")}>
                {d.done ? "✓" : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="streak-headline">
          <span className="streak-count">{streak}</span>
          <span className="streak-unit">日連続です！</span>
        </p>
      </div>

      <button type="button" className="complete-back-btn" onClick={onBack}>
        ホームに戻る
      </button>
    </section>
  );
}
