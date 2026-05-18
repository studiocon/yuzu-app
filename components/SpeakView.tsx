"use client";

import { useState } from "react";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import FloatingDots from "./FloatingDots";
import Waveform from "./Waveform";
import { pickPrompt } from "@/lib/prompts";

type Phase = "idle" | "recording" | "busy" | "complete";

type Props = {
  phase: Phase;
  shortTap: boolean;
  statusMsg: string | null;
  error: string | null;
  hint: string | null;
  permissionDenied: boolean;
  analyser: AnalyserNode | null;
  onPressStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onPressEnd: () => void;
  onPressCancel: () => void;
};

export default function SpeakView({
  phase,
  shortTap,
  statusMsg,
  error,
  hint,
  permissionDenied,
  analyser,
  onPressStart,
  onPressEnd,
  onPressCancel,
}: Props) {
  const isRecording = phase === "recording";
  const isBusy = phase === "busy";
  const [prompt] = useState(() => pickPrompt());

  const isIdleHero =
    phase === "idle" && !permissionDenied && !error && !shortTap;

  const status =
    permissionDenied ? "マイクを許可しろ。" :
    error ? error :
    isBusy ? (statusMsg ?? "DECODING.") :
    isRecording ? "RECORDING." :
    shortTap ? "短い。話せ。" : "";

  return (
    <section className="speak-view">
      {!isIdleHero && <p className="speak-top" role="status" aria-live="polite">{status}</p>}

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
            <p className="speak-prompt-hint">長押し。話せ</p>
          </div>
        )}
        <div className="mic-wrap">
          {isRecording && (
            <svg className="mic-progress-ring" viewBox="0 0 116 116" aria-hidden>
              <circle className="mic-progress-track" cx="58" cy="58" r="54" />
              <circle className="mic-progress-fill" cx="58" cy="58" r="54" />
            </svg>
          )}
          <button
            aria-label="長押しで録音"
            aria-pressed={isRecording}
            disabled={isBusy}
            className={"mic-button-large" + (isRecording ? " recording" : "") + (permissionDenied ? " denied" : "")}
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onMouseLeave={() => { if (isRecording) onPressEnd(); }}
            onTouchStart={onPressStart}
            onTouchEnd={onPressEnd}
            onTouchCancel={onPressCancel}
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
