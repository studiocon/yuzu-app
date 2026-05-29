"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Microphone, X } from "@phosphor-icons/react";
import SpeakView from "./SpeakView";
import CompleteView from "./CompleteView";
import type { Post, Phase } from "@/lib/types";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

function LimitView() {
  return (
    <section className="limit-view">
      <p className="limit-view-count font-display">3 / 3</p>
      <p className="limit-view-msg">今日はここまで。<br />明日また話せ。</p>
    </section>
  );
}

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
  permissionDenied: boolean;
  analyser: AnalyserNode | null;
  lastPost: Post | null;
  posts: Post[];
  totalDurationMs?: number;
  serverStreak?: number;
  limitReached: boolean;
  remainingSessions: number;
  recordingElapsed: number;
  maxRecordMs: number;
  onPressStart: (e: React.PointerEvent) => void;
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
  permissionDenied,
  analyser,
  lastPost,
  posts,
  totalDurationMs,
  serverStreak,
  limitReached,
  remainingSessions,
  recordingElapsed,
  maxRecordMs,
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
    const fab = document.querySelector<HTMLElement>(".fab-record");
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

  useBodyScrollLock(mounted);

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
        <CompleteView post={lastPost} posts={posts} totalDurationMs={totalDurationMs} serverStreak={serverStreak} onBack={onClose} />
      ) : limitReached ? (
        <LimitView />
      ) : (
        <SpeakView
          phase={phase}
          shortTap={shortTap}
          statusMsg={statusMsg}
          error={error}
          hint={hint}
          permissionDenied={permissionDenied}
          analyser={analyser}
          remainingSessions={remainingSessions}
          recordingElapsed={recordingElapsed}
          maxRecordMs={maxRecordMs}
          onPressStart={onPressStart}
          onPressEnd={onPressEnd}
          onPressCancel={onPressCancel}
        />
      )}
    </div>
  );
}
