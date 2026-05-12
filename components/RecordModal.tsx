"use client";

import { useEffect, useState } from "react";
import { Microphone } from "@phosphor-icons/react";
import SpeakView from "./SpeakView";

type Phase = "idle" | "recording" | "busy";
type AnimState = "opening" | "open" | "closing";

// Must match .rm-fly-mic width/height in CSS
const FLY_SIZE = 140;
const OPEN_MS = 480;
const CLOSE_MS = 420;

type Props = {
  open: boolean;
  onClose: () => void;
  phase: Phase;
  shortTap: boolean;
  statusMsg: string | null;
  error: string | null;
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
  onPressStart,
  onPressEnd,
  onPressCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [animState, setAnimState] = useState<AnimState>("opening");
  const [flyVars, setFlyVars] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (open) {
      // Measure FAB before mounting so the flying element starts at the right spot
      const fab = document.querySelector<HTMLElement>(".mic-fab");
      if (fab) {
        const r = fab.getBoundingClientRect();
        const fabCx = r.left + r.width / 2;
        const fabCy = r.top + r.height / 2;
        setFlyVars({
          "--fly-dx": `${fabCx - window.innerWidth / 2}px`,
          "--fly-dy": `${fabCy - window.innerHeight / 2}px`,
          "--fly-scale": `${r.width / FLY_SIZE}`,
        } as React.CSSProperties);
      }
      setMounted(true);
      setAnimState("opening");
    } else if (mounted) {
      setAnimState("closing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Timer-based state transitions (avoids fighting with child animationend events)
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

  const canClose = phase === "idle";

  return (
    <div className="record-modal" data-anim={animState} style={flyVars}>
      {/* Orange flash that instantly covers the screen, then fades */}
      <div className="rm-flash" aria-hidden />

      {/* Flying mic: travels from FAB position to center */}
      <div className="rm-fly-mic" aria-hidden>
        <Microphone size={52} weight="fill" />
      </div>

      <button
        type="button"
        className="record-modal-close"
        aria-label="閉じる"
        onClick={onClose}
        disabled={!canClose}
      >
        ×
      </button>
      <SpeakView
        phase={phase}
        shortTap={shortTap}
        statusMsg={statusMsg}
        error={error}
        onPressStart={onPressStart}
        onPressEnd={onPressEnd}
        onPressCancel={onPressCancel}
      />
    </div>
  );
}
