"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Phase } from "./types";
import { MAX_RECORD_MS } from "./constants";

const MIN_RECORD_MS = 500;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getString(data: unknown, key: string): string | undefined {
  if (!isObj(data)) return undefined;
  const v = data[key];
  return typeof v === "string" ? v : undefined;
}
async function safeJson(res: Response): Promise<unknown> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export type TranscribeOutcome =
  | { kind: "text"; text: string; durationMs: number }
  | { kind: "login_required" }
  | { kind: "daily_limit" }
  | { kind: "error"; message: string }
  | { kind: "short" }
  | { kind: "silence" };

export type RecorderApi = {
  phase: Phase;
  shortTap: boolean;
  statusMsg: string | null;
  error: string | null;
  hint: string | null;
  permissionDenied: boolean;
  analyser: AnalyserNode | null;
  recordingElapsed: number;
  maxRecordMs: number;
  onPressStart: (e: React.PointerEvent) => Promise<void>;
  onPressEnd: () => Promise<void>;
  onPressCancel: () => void;
  /** 保存成功後に外部から呼んで phase=complete に立てる */
  setComplete: () => void;
  /** complete → idle に戻す。CompleteView の閉じる時に呼ぶ。 */
  dismissComplete: () => void;
  /** 録音モーダル close 時。idle / complete からのみ idle に戻す。 */
  resetIfIdleOrComplete: () => void;
  /** 録音できる状態か（client side check; server が信頼源） */
  canRecord: () => boolean;
  /** 外部（保存失敗等）からエラー表示 + idle に戻す */
  failWithError: (msg: string) => void;
};

type Options = {
  /** client side gate — 上限超過時は record 開始を block。サーバが最終判定。 */
  isAtDailyLimit: () => boolean;
  /** STT 完了時に呼ぶ。呼び出し側で「ログイン状態を見て save / pending 振り分け」する。 */
  onTranscribed: (outcome: TranscribeOutcome) => void | Promise<void>;
};

export function useRecorder({ isAtDailyLimit, onTranscribed }: Options): RecorderApi {
  // onTranscribed / isAtDailyLimit を ref に逃がして stale closure を回避。
  // onPressEnd 等の useCallback は deps=[] のため、初回レンダー時のコールバックを握り続けてしまう。
  const onTranscribedRef = useRef(onTranscribed);
  const isAtDailyLimitRef = useRef(isAtDailyLimit);
  useEffect(() => { onTranscribedRef.current = onTranscribed; }, [onTranscribed]);
  useEffect(() => { isAtDailyLimitRef.current = isAtDailyLimit; }, [isAtDailyLimit]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [shortTap, setShortTap] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const showHint = (msg: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(msg);
    hintTimerRef.current = setTimeout(() => setHint(null), 2000);
  };

  const pickRecorderMime = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/mp4", "audio/mp4;codecs=mp4a.40.2",
      "audio/webm;codecs=opus", "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    for (const m of candidates) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
    }
    return undefined;
  };

  const setupAnalyser = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      ctx.resume?.();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 32;
      source.connect(node);
      audioCtxRef.current = ctx;
      analyserRef.current = node;
      setAnalyser(node);
    } catch (err) {
      console.warn("AudioContext setup failed", err);
    }
  };

  const teardownAnalyser = () => {
    try { analyserRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    analyserRef.current = null;
    audioCtxRef.current = null;
    setAnalyser(null);
  };

  const startMediaRecorder = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("このブラウザは録音に対応していません");
        setPhaseSync("idle");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setupAnalyser(stream);
      const mime = pickRecorderMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      recorderRef.current = mr;
      return true;
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setPermissionDenied(true);
      } else {
        setError("マイクへのアクセスに失敗しました");
      }
      setPhaseSync("idle");
      return false;
    }
  };

  const stopAndGetBlob = (): Promise<Blob> =>
    new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr || mr.state === "inactive") { resolve(new Blob([])); return; }
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        teardownAnalyser();
        resolve(new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }));
        recorderRef.current = null;
      };
      mr.stop();
    });

  const clearRecordingTimers = () => {
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    setRecordingElapsed(0);
  };

  const cancelRecorder = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") { mr.onstop = null; mr.stop(); }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    teardownAnalyser();
  };

  const transcribe = async (blob: Blob, durationMs: number) => {
    setStatusMsg("DECODING.");
    try {
      const ext = blob.type.includes("mp4") ? "mp4"
        : blob.type.includes("ogg") ? "ogg"
        : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await safeJson(res);
      if (!res.ok) {
        const err = getString(data, "error");
        if (err === "login_required") {
          setStatusMsg(null); setPhaseSync("idle");
          await onTranscribedRef.current({ kind: "login_required" });
          return;
        }
        if (err === "daily_limit") {
          setStatusMsg(null); setPhaseSync("idle");
          await onTranscribedRef.current({ kind: "daily_limit" });
          return;
        }
        throw new Error(err || "失敗、話せ");
      }

      const text = getString(data, "text") ?? "";
      if (text === "") { showHint("無音、話せ"); setStatusMsg(null); setPhaseSync("idle"); await onTranscribed({ kind: "silence" }); return; }
      if (text.length < 5) { showHint("短い、話せ"); setStatusMsg(null); setPhaseSync("idle"); await onTranscribed({ kind: "short" }); return; }

      // 成功 — phase は呼び出し側が save 結果に応じて complete / idle を決める
      setStatusMsg(null);
      await onTranscribedRef.current({ kind: "text", text, durationMs });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setError(msg);
      setStatusMsg(null); setPhaseSync("idle");
      await onTranscribedRef.current({ kind: "error", message: msg });
    }
  };

  // transcribe を ref で固定（毎レンダー再生成されるが、最新の onTranscribedRef を読むのでOK）
  const transcribeRef = useRef(transcribe);
  transcribeRef.current = transcribe;

  const onPressStart = useCallback(async (e: React.PointerEvent) => {
    e.preventDefault();
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch {}
    if (phaseRef.current !== "idle") return;
    if (isAtDailyLimitRef.current()) return;

    setError(null);
    setPermissionDenied(false);
    setShortTap(false);
    pressStartRef.current = Date.now();
    setPhaseSync("recording");

    const ok = await startMediaRecorder();
    if (!ok) return;

    setRecordingElapsed(0);
    elapsedTimerRef.current = setInterval(() => {
      setRecordingElapsed(Date.now() - pressStartRef.current);
    }, 250);
    autoStopTimerRef.current = setTimeout(() => { onPressEnd(); }, MAX_RECORD_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAtDailyLimit]);

  const onPressEnd = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    clearRecordingTimers();
    const held = Date.now() - pressStartRef.current;
    if (held < MIN_RECORD_MS) {
      cancelRecorder();
      setPhaseSync("idle");
      setShortTap(true);
      setTimeout(() => setShortTap(false), 2500);
      return;
    }
    setPhaseSync("busy");
    const blob = await stopAndGetBlob();
    if (blob.size === 0) { setPhaseSync("idle"); return; }
    await transcribeRef.current(blob, held);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPressCancel = useCallback(() => {
    clearRecordingTimers();
    cancelRecorder();
    setPhaseSync("idle");
  }, []);

  const setPhaseFromOutside = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const dismissComplete = useCallback(() => {
    if (phaseRef.current !== "complete") return;
    setPhaseFromOutside("idle");
  }, []);

  const resetIfIdleOrComplete = useCallback(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "complete") return;
    setPhaseFromOutside("idle");
  }, []);

  const canRecord = useCallback(() => !isAtDailyLimitRef.current() && phaseRef.current === "idle", []);

  const setComplete = useCallback(() => setPhaseFromOutside("complete"), []);

  const failWithError = useCallback((msg: string) => {
    setError(msg);
    setStatusMsg(null);
    setPhaseFromOutside("idle");
  }, []);

  return {
    phase,
    shortTap,
    statusMsg,
    error,
    hint,
    permissionDenied,
    analyser,
    recordingElapsed,
    maxRecordMs: MAX_RECORD_MS,
    onPressStart,
    onPressEnd,
    onPressCancel,
    setComplete,
    dismissComplete,
    resetIfIdleOrComplete,
    canRecord,
    failWithError,
  };
}
