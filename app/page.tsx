"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Gear } from "@phosphor-icons/react";
import HomeView from "@/components/HomeView";
import MyPageView from "@/components/MyPageView";
import OnboardingView from "@/components/OnboardingView";
import RecordModal from "@/components/RecordModal";
import TabBar, { type MainTab } from "@/components/TabBar";
import type { Post } from "@/lib/types";
import { buildMockPosts } from "@/lib/mockPosts";
import { isMockMode } from "@/lib/mockReports";
import { loadSentimentCache, saveSentimentCache } from "@/lib/userClient";
import { countUnread } from "@/lib/notifications";

type Phase = "idle" | "recording" | "busy" | "complete";

const EMOJI_KEY = "yuzu-emoji";
const MIN_RECORD_MS = 300;
const FRUITS = ["🍑","🍋","🍇","🥝","🍓","🫐","🍈","🍊","🍍","🥭","🍌","🍒","🍎","🍐","🫒"];
const pickFruit = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

export default function Home() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shortTap, setShortTap] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [myEmoji, setMyEmoji] = useState<string>("🍑");
  const [mySessionId, setMySessionId] = useState<string | null>(null);
  const [hasUnreadSignal, setHasUnreadSignal] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [tab, setTab] = useState<MainTab>("home");
  const [lastPost, setLastPost] = useState<Post | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
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

    setHasUnreadSignal(countUnread() > 0);

    if (isMockMode()) {
      const { posts: mockPosts, sentiments } = buildMockPosts(e ?? "🍑", "mock-session");
      setPosts(mockPosts);
      setMySessionId("mock-session");
      const prev = loadSentimentCache();
      saveSentimentCache({ ...prev, ...sentiments });
      return;
    }

    fetch("/api/posts")
      .then(safeJson)
      .then((data) => {
        setPosts(data?.posts ?? []);
        if (data?.sessionId) setMySessionId(data.sessionId);
      })
      .catch(() => { setPosts([]); });
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
    setPermissionDenied(false);
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
    setStatusMsg("DECODING.");
    try {
      const ext = blob.type.includes("mp4") ? "mp4"
        : blob.type.includes("ogg") ? "ogg"
        : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "失敗。話せ。");

      const text: string = data?.text ?? "";
      if (text === "") {
        showHint("無音。話せ。");
        setStatusMsg(null);
        setPhaseSync("idle");
        return;
      }
      if (text.length < 5) {
        showHint("短い。話せ。");
        setStatusMsg(null);
        setPhaseSync("idle");
        return;
      }

      const saveRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, emoji: myEmoji }),
      });
      const saveData = await safeJson(saveRes);
      if (!saveRes.ok) {
        if (saveData?.error === "kv_not_configured") {
          throw new Error("保存先が未接続。");
        }
        throw new Error(saveData?.error || "保存失敗。");
      }

      const newPost: Post | undefined = saveData?.post;
      if (!newPost) throw new Error("保存に失敗しました");
      if (saveData?.sessionId) setMySessionId(saveData.sessionId);
      setPosts((prev) => [newPost, ...(prev ?? [])]);
      setHasUnreadSignal(countUnread() > 0);
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

  const myPosts = useMemo<Post[]>(() => {
    if (!posts) return [];
    if (!mySessionId) return posts;
    return posts.filter((p) => p.sessionId === mySessionId);
  }, [posts, mySessionId]);
  const isLoaded = posts !== null;
  const isOnboarding = isLoaded && myPosts.length === 0;

  return (
    <main
      className="app-shell"
      data-onboarding={isOnboarding ? "" : undefined}
      data-has-tabbar={isLoaded && !isOnboarding ? "" : undefined}
    >
      <header className="app-header">
        <div className="app-header-row">
          {!isOnboarding ? (
            <Link href="/signal" className="iconbtn iconbtn--ghost signal-trigger" aria-label="SIGNAL">
              <Bell size={22} weight="bold" />
              {hasUnreadSignal && <span className="notif-dot" aria-hidden />}
            </Link>
          ) : (
            <span className="app-header-spacer" aria-hidden />
          )}
          <svg className="app-logo" viewBox="0 0 255 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="YUZU">
            <path d="M0 20.8956C0 11.4394 0 6.71129 2.9482 3.77361C5.8964 0.835938 10.6415 0.835938 20.1316 0.835938H234.868C244.359 0.835938 249.104 0.835938 252.052 3.77361C255 6.71129 255 11.4394 255 20.8956V63.9404C255 73.3966 255 78.1248 252.052 81.0624C249.104 84.0001 244.359 84.0001 234.868 84.0001H20.1316C10.6415 84.0001 5.8964 84.0001 2.9482 81.0624C0 78.1248 0 73.3966 0 63.9404V20.8956Z" fill="#F5D84A"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M95.0898 45.501C95.0899 47.2374 95.3873 48.7411 95.9824 50.0117C96.6201 51.24 97.5764 52.1934 98.8516 52.8711C100.127 53.5487 101.763 53.8876 103.761 53.8877C105.801 53.8877 107.459 53.5698 108.734 52.9346C110.01 52.2569 110.945 51.2823 111.54 50.0117C112.135 48.7411 112.433 47.2374 112.433 45.501V19.7051H128.884V46.3896C128.884 50.8369 127.842 54.7129 125.76 58.0166C123.677 61.3204 120.743 63.9048 116.96 65.7686C113.219 67.5898 108.819 68.5 103.761 68.5C98.745 68.4999 94.3456 67.5898 90.5625 65.7686C86.8217 63.9048 83.8881 61.3204 81.7627 58.0166C79.6799 54.7128 78.6387 50.8369 78.6387 46.3896V19.7051H95.0898V45.501ZM198.306 45.501C198.306 47.2374 198.604 48.7411 199.199 50.0117C199.837 51.2399 200.793 52.1934 202.068 52.8711C203.344 53.5486 204.98 53.8877 206.978 53.8877C209.018 53.8877 210.676 53.5698 211.951 52.9346C213.226 52.2569 214.162 51.2824 214.757 50.0117C215.352 48.7411 215.649 47.2374 215.649 45.501V19.7051H232.101V46.3896C232.101 50.8369 231.059 54.7129 228.977 58.0166C226.894 61.3204 223.96 63.9048 220.177 65.7686C216.436 67.5899 212.036 68.5 206.978 68.5C201.962 68.5 197.562 67.5897 193.779 65.7686C190.039 63.9048 187.105 61.3204 184.979 58.0166C182.897 54.7128 181.855 50.837 181.855 46.3896V19.7051H198.306V45.501ZM178.917 31.2686L153.448 54.7773H179.108V67.3574H131.669V55.7295L157.193 32.2217H131.86V19.6416H178.917V31.2686ZM48.1182 35.708L60.5273 19.7051H78.5723L56.3828 48.1006V67.3564H39.9326V48.3604L17.6152 19.7051H35.6602L48.1182 35.708Z" fill="#1A1A30"/>
          </svg>
          {!isOnboarding ? (
            <Link href="/settings" className="iconbtn iconbtn--ghost" aria-label="設定">
              <Gear size={22} weight="bold" />
            </Link>
          ) : (
            <span className="app-header-spacer" aria-hidden />
          )}
        </div>
      </header>

      {!isLoaded ? null : isOnboarding ? (
        <OnboardingView onStart={() => setRecordOpen(true)} />
      ) : tab === "home" ? (
        <HomeView myEmoji={myEmoji} myPosts={myPosts} />
      ) : (
        <MyPageView myEmoji={myEmoji} myPosts={myPosts} mySessionId={mySessionId} />
      )}

      {isLoaded && !isOnboarding && (
        <TabBar
          tab={tab}
          onChange={setTab}
          onOpenRecord={() => setRecordOpen(true)}
          hidden={recordOpen}
        />
      )}

      <RecordModal
        open={recordOpen}
        onClose={handleCloseModal}
        phase={phase}
        shortTap={shortTap}
        statusMsg={statusMsg}
        error={error}
        hint={hint}
        permissionDenied={permissionDenied}
        analyser={analyser}
        lastPost={lastPost}
        posts={posts ?? []}
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
