"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone } from "@phosphor-icons/react";
import MyPageView from "@/components/MyPageView";
import RecordModal from "@/components/RecordModal";
import type { Post } from "@/lib/types";

type Phase = "idle" | "recording" | "busy" | "complete";

const EMOJI_KEY = "yuzu-emoji";
const MIN_RECORD_MS = 300;
const FRUITS = ["🍑","🍋","🍇","🥝","🍓","🫐","🍈","🍊","🍍","🥭","🍌","🍒","🍎","🍐","🫒"];
const pickFruit = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

function randomEllipse(): string {
  const r = () => 30 + Math.round(Math.random() * 40);
  return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
}
const randomBlob = (): [string, string, string] => [randomEllipse(), randomEllipse(), randomEllipse()];

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shortTap, setShortTap] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [myEmoji, setMyEmoji] = useState<string>("🍑");
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [lastPost, setLastPost] = useState<Post | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = (msg: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(msg);
    hintTimerRef.current = setTimeout(() => setHint(null), 2000);
  };

  const pressStartRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    let e: string | null = null;
    try {
      e = localStorage.getItem(EMOJI_KEY);
      if (!e) {
        e = pickFruit();
        localStorage.setItem(EMOJI_KEY, e);
      }
    } catch {}
    if (e) setMyEmoji(e);

    fetch("/api/posts")
      .then(safeJson)
      .then((data) => {
        setPosts(data?.posts ?? []);
        if (data?.sessionId) setMySessionId(data.sessionId);
      })
      .catch(() => {});
  }, []);

  const pickRecorderMime = (): string | undefined => {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/mp4",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/webm;codecs=opus",
      "audio/webm",
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
    try {
      analyserRef.current?.disconnect();
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
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
      console.error("startMediaRecorder failed", err);
      setError("マイクへのアクセスに失敗しました");
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

  const cancelRecorder = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") { mr.onstop = null; mr.stop(); }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    teardownAnalyser();
  };

  const handlePressStart = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (phaseRef.current !== "idle") return;

    setError(null);
    setShortTap(false);
    pressStartRef.current = Date.now();
    setPhaseSync("recording");

    const ok = await startMediaRecorder();
    if (!ok) return;
  };

  const handlePressEnd = async () => {
    if (phaseRef.current !== "recording") return;

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
    await transcribeAndSave(blob);
  };

  const handlePressCancel = () => {
    cancelRecorder();
    setPhaseSync("idle");
  };

  const transcribeAndSave = async (blob: Blob) => {
    setStatusMsg("言葉にしてるよ…");
    try {
      const ext = blob.type.includes("mp4") ? "mp4"
        : blob.type.includes("ogg") ? "ogg"
        : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "文字起こしに失敗しました");

      const text: string = data?.text ?? "";
      if (text === "") {
        showHint("声が聞こえなかったよ。もう一度話してみて。");
        setStatusMsg(null);
        setPhaseSync("idle");
        return;
      }
      if (text.length < 5) {
        showHint("もう少し話してみて。");
        setStatusMsg(null);
        setPhaseSync("idle");
        return;
      }

      const blobShape = randomBlob();
      const saveRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, emoji: myEmoji, blob: blobShape }),
      });
      const saveData = await safeJson(saveRes);
      if (!saveRes.ok) {
        if (saveData?.error === "kv_not_configured") {
          throw new Error("サーバーの保存先が未設定です（KV未接続）");
        }
        throw new Error(saveData?.error || "保存に失敗しました");
      }

      const newPost: Post | undefined = saveData?.post;
      if (!newPost) throw new Error("保存に失敗しました");
      if (saveData?.sessionId) setMySessionId(saveData.sessionId);
      setPosts((prev) => [newPost, ...prev]);
      setStatusMsg(null);
      setLastPost(newPost);
      setPhaseSync("complete");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStatusMsg(null);
      setPhaseSync("idle");
    }
  };

  const handleCloseModal = () => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "complete") return;
    setRecordOpen(false);
    setPhaseSync("idle");
    setLastPost(null);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <svg className="app-logo" viewBox="0 0 785 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="YUZU">
          <path d="M68.3733 24.96C35.52 27.3066 11.7333 54.2933 10.9867 90.3466C10.7733 106.133 16.96 125.867 29.9733 138.667C39.1467 147.733 51.7333 153.387 66.1333 156.8C71.68 158.08 80.8533 158.613 89.7066 157.013C95.68 156.053 102.08 154.24 106.987 152.853C119.467 149.227 128.107 146.88 135.893 136.747C149.227 119.36 153.067 93.2266 146.347 70.4C141.867 55.4666 133.76 43.9466 116.267 32.8533L68.3733 24.96Z" fill="#F5D84A"/>
          <path d="M68.48 24.8533C79.4666 11.9467 87.8933 4.16 101.653 2.45334C112.32 1.06667 124.907 1.81334 142.613 4.16C144.213 4.37334 143.36 6.18667 143.04 7.04C138.773 18.4533 129.813 28.48 116.907 32.8533C106.56 35.52 92.5867 32.1067 69.12 25.3867L68.48 24.8533Z" fill="#2D5015"/>
          <path d="M685.529 92.9217C685.529 98.6336 686.564 103.495 688.634 107.505C690.704 111.516 693.808 114.675 697.947 116.984C702.087 119.172 707.261 120.266 713.47 120.266C719.922 120.266 725.218 119.172 729.358 116.984C733.497 114.797 736.541 111.698 738.488 107.687C740.558 103.555 741.593 98.6336 741.593 92.9217V18.1821H784.143V95.2915C784.143 107.809 781.221 118.807 775.377 128.286C769.533 137.644 761.316 144.936 750.724 150.161C740.132 155.387 727.714 158 713.47 158C699.469 158 687.173 155.387 676.581 150.161C665.989 144.936 657.711 137.644 651.745 128.286C645.902 118.807 642.98 107.809 642.98 95.2915V18.1821H685.529V92.9217Z" fill="#F5D84A"/>
          <path d="M499.467 154.901V124.458L585.297 42.7917L616.889 50.9948H500.197V18H632.96V48.4427L547.312 130.292L520.468 122.089H633.508V154.901H499.467Z" fill="#F5D84A"/>
          <path d="M390.42 92.9217C390.42 98.6336 391.455 103.495 393.525 107.505C395.594 111.516 398.699 114.675 402.838 116.984C406.978 119.172 412.152 120.266 418.361 120.266C424.813 120.266 430.109 119.172 434.248 116.984C438.388 114.797 441.431 111.698 443.379 107.687C445.449 103.555 446.484 98.6336 446.484 92.9217V18.1821H489.034V95.2915C489.034 107.809 486.112 118.807 480.268 128.286C474.424 137.644 466.206 144.936 455.615 150.161C445.023 155.387 432.605 158 418.361 158C404.36 158 392.064 155.387 381.472 150.161C370.88 144.936 362.602 137.644 356.636 128.286C350.792 118.807 347.87 107.809 347.87 95.2915V18.1821H390.42V92.9217Z" fill="#F5D84A"/>
          <path d="M237.099 154.901V87.8178H279.648V154.901H237.099ZM173 18.1824H219.75L267.413 79.0678H249.151L296.632 18.1824H343.382L271.979 109.146L244.586 109.693L173 18.1824Z" fill="#F5D84A"/>
        </svg>
      </header>

      <MyPageView myEmoji={myEmoji} posts={posts} mySessionId={mySessionId} />

      <button
        type="button"
        className="mic-fab"
        aria-label="録音を開く"
        onClick={() => setRecordOpen(true)}
      >
        <Microphone size={28} weight="fill" color="#fff" />
      </button>

      <RecordModal
        open={recordOpen}
        onClose={handleCloseModal}
        phase={phase}
        shortTap={shortTap}
        statusMsg={statusMsg}
        error={error}
        hint={hint}
        analyser={analyser}
        lastPost={lastPost}
        posts={posts}
        myEmoji={myEmoji}
        onPressStart={handlePressStart}
        onPressEnd={handlePressEnd}
        onPressCancel={handlePressCancel}
      />
    </main>
  );
}

async function safeJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
