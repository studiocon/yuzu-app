"use client";

import { useState } from "react";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import FloatingDots from "./FloatingDots";
import Waveform from "./Waveform";
import { pickPrompt } from "@/lib/prompts";
import type { Phase } from "@/lib/types";

type Props = {
  phase: Phase;
  shortTap: boolean;
  statusMsg: string | null;
  error: string | null;
  hint: string | null;
  permissionDenied: boolean;
  analyser: AnalyserNode | null;
  remainingSessions: number;
  recordingElapsed: number;
  maxRecordMs: number;
  onPressStart: (e: React.PointerEvent) => void;
  onPressEnd: () => void;
  onPressCancel: () => void;
};

const CIRCUMFERENCE = 339.3; // 2π × 54

function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SpeakView({
  phase,
  shortTap,
  statusMsg,
  error,
  hint,
  permissionDenied,
  analyser,
  remainingSessions,
  recordingElapsed,
  maxRecordMs,
  onPressStart,
  onPressEnd,
  onPressCancel,
}: Props) {
  const isRecording = phase === "recording";
  const isBusy = phase === "busy";
  const [prompt] = useState(() => pickPrompt());

  const isIdleHero =
    phase === "idle" && !permissionDenied && !error && !shortTap;

  const remainingMs = Math.max(0, maxRecordMs - recordingElapsed);
  const progress = Math.min(recordingElapsed / maxRecordMs, 1);
  const ringOffset = CIRCUMFERENCE * (1 - progress);

  const status =
    permissionDenied ? "マイクを許可しろ" :
    error ? error :
    isBusy ? (statusMsg ?? "CARVING.") :
    isRecording ? "RECORDING." :
    shortTap ? "短い、話せ" : "";

  return (
    <section className="speak-view">
      {!isIdleHero && <p className="speak-top" role="status" aria-live="polite">{status}</p>}
      {isRecording && (
        <p className="speak-timer font-display" aria-live="off">
          {formatCountdown(remainingMs)}
        </p>
      )}

      <div className="speak-stage">
        {phase === "idle" && <FloatingDots phase={phase} />}
        {isRecording && <Waveform analyser={analyser} active />}
        {isBusy && (
          <div className="speak-spinner" aria-hidden>
            <span className="spinner-ring" />
          </div>
        )}
        <p className="speak-hint" data-show={hint ? "true" : "false"} aria-live="polite">
          {hint ?? ""}
        </p>
      </div>

      <div className="speak-bottom">
        {isIdleHero && (
          <div className="speak-prompt">
            <p className="speak-prompt-text">{prompt}</p>
          </div>
        )}
        {isIdleHero && remainingSessions < 3 && (
          <p className="speak-remaining font-display">
            {remainingSessions} LEFT.
          </p>
        )}
        <div className="mic-wrap">
          {isRecording && (
            <svg className="mic-progress-ring" viewBox="0 0 116 116" aria-hidden>
              <circle className="mic-progress-track" cx="58" cy="58" r="54" />
              <circle
                className="mic-progress-fill"
                cx="58" cy="58" r="54"
                style={{ strokeDashoffset: ringOffset }}
              />
            </svg>
          )}
          <button
            aria-label="長押しで録音"
            aria-pressed={isRecording}
            disabled={isBusy}
            className={"mic-button-large" + (isRecording ? " recording" : "") + (permissionDenied ? " denied" : "")}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerCancel={onPressCancel}
            onContextMenu={(e) => e.preventDefault()}
          >
            {permissionDenied
              ? <MicrophoneSlash size={40} weight="fill" />
              : <Microphone size={40} weight="fill" />}
          </button>
        </div>
      </div>
    </section>
  );
}
