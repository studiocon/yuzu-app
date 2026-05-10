"use client";

import { useEffect, useRef, useState } from "react";
import TabBar, { type Tab } from "@/components/TabBar";
import SpeakView from "@/components/SpeakView";
import TimelineView, { type Post } from "@/components/TimelineView";
import MyPageView from "@/components/MyPageView";

type Phase = "idle" | "recording" | "busy";

const EMOJI_KEY = "yuzu-emoji";
const MIN_RECORD_MS = 300;
const FRUITS = ["🍑","🍋","🍇","🥝","🍓","🫐","🍈","🍊","🍍","🥭","🍌","🍒","🍎","🍐","🫒"];
const pickFruit = () => FRUITS[Math.floor(Math.random() * FRUITS.length)];

function randomEllipse(): string {
  const r = () => 30 + Math.round(Math.random() * 40); // 30–70 (more distorted)
  return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
}
const randomBlob = (): [string, string, string] => [randomEllipse(), randomEllipse(), randomEllipse()];

export default function Home() {
  const [tab, setTab] = useState<Tab>("speak");
  const [posts, setPosts] = useState<Post[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shortTap, setShortTap] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myEmoji, setMyEmoji] = useState<string>("🍑");
  const [newPostId, setNewPostId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const pressStartRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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
      .then((data) => setPosts(data?.posts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset scroll state on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setScrolled(false);
  }, [tab]);

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

  const startMediaRecorder = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("このブラウザは録音に対応していません");
        setPhaseSync("idle");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
      if (!text.trim()) { setError("声を聴き取れなかった"); return; }

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
      setPosts((prev) => [newPost, ...prev]);
      setNewPostId(newPost.id);
      setStatusMsg(null);
      // Auto-jump to timeline so the user sees their new post
      setTab("timeline");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStatusMsg(null);
    } finally {
      setPhaseSync("idle");
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header" data-hidden={scrolled}>
        <svg className="app-logo" viewBox="0 0 855 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PEACH">
          <path d="M646.578 23C659.107 23 670.197 25.1567 679.851 29.4697C689.606 33.7828 697.411 39.8418 703.265 47.6465C709.221 55.3485 712.816 64.3857 714.048 74.7578H678.002C676.975 70.342 675.075 66.5935 672.303 63.5127C669.633 60.3292 666.141 57.9156 661.828 56.2725C657.515 54.5267 652.432 53.6543 646.578 53.6543C640.006 53.6543 634.358 54.8354 629.634 57.1973C624.91 59.5592 621.264 62.9991 618.696 67.5176C616.129 71.9334 614.846 77.2223 614.846 83.3838C614.846 89.5453 616.129 94.8342 618.696 99.25C621.264 103.666 624.91 107.107 629.634 109.571C634.358 111.933 640.006 113.114 646.578 113.114C652.432 113.114 657.515 112.344 661.828 110.804C666.141 109.161 669.633 106.747 672.303 103.563C675.075 100.38 676.975 96.5291 678.002 92.0107H714.048C712.815 102.28 709.221 111.316 703.265 119.121C697.411 126.926 689.607 132.986 679.851 137.299C670.197 141.612 659.107 143.768 646.578 143.768C633.023 143.768 621.161 141.252 610.994 136.22C600.828 131.188 592.921 124.153 587.272 115.116C581.624 106.079 578.8 95.5017 578.8 83.3838C578.8 71.266 581.624 60.6884 587.272 51.6514C592.921 42.6145 600.828 35.5798 610.994 30.5479C621.161 25.5159 633.023 23 646.578 23ZM258.084 25.6191C268.148 25.6192 276.774 27.3133 283.963 30.7021C291.254 34.091 296.799 38.8668 300.599 45.0283C304.398 51.0872 306.299 58.2756 306.299 66.5938C306.299 74.8092 304.398 81.9976 300.599 88.1592C296.799 94.3207 291.254 99.0965 283.963 102.485C276.774 105.874 268.148 107.568 258.084 107.568H227.892V141.149H192V25.6191H258.084ZM424.03 54.2705H353.383L356.054 70.7529H419.409V96.0156H356.054L353.383 112.498H424.801V141.149H315.277L323.903 83.3838L315.277 25.6191H424.03V54.2705ZM580.7 141.149H542.344L533.628 120.354H476.843L468.096 141.149H429.894L481.497 25.6191H528.942L580.7 141.149ZM764.479 66.4395H818.547V25.6191H854.438V141.149H818.547V98.1719H764.479V141.149H728.587V25.6191H764.479V66.4395ZM488.896 91.7021H521.62L505.287 52.7334L488.896 91.7021ZM227.892 79.2256H255.772C260.291 79.2256 263.783 78.0952 266.248 75.8359C268.815 73.5767 270.099 70.496 270.099 66.5938C270.099 62.4861 268.815 59.3538 266.248 57.1973C263.783 55.0407 260.291 53.9629 255.772 53.9629H227.892V79.2256Z" fill="#FF2B64"/>
          <path d="M73.5 30.7501C74.375 21.7501 82.125 2.0001 107.625 1.3751C121 1.0001 132 4.8751 150.625 5.6251C151.5 5.6251 151.75 6.1251 151.625 6.8751C149.875 13.6251 142.375 30.2501 123.75 36.0001L121.875 36.7501L93.5 36.6251C93.5 36.6251 76.25 42.5001 74.875 42.0001C73.5 41.5001 73.5 30.7501 73.5 30.7501Z" fill="#FFA9F1"/>
          <path d="M128.875 39.375C121.625 36.125 114.625 34.5 105.5 34.5C96.875 34.5 90.125 36.125 82.875 39.125C80.125 40.25 75.25 42.625 74.375 40.25C73.875 37.375 73.5 33.5 73.5 30.75C71.75 26.125 69.125 20 65.625 14.125C64.875 13 63.875 12.125 62.375 12.5C60.625 13 57.75 14.125 55.75 15.75C54.75 16.75 54.25 18.125 55.25 19.5C57.25 22.625 62 29.25 64.125 37.375C60.125 36.125 56 35.125 50.125 35.125C27.75 34.875 7.62498 54.375 4.37498 73C2.37498 83.75 3.87498 96.625 8.37498 107.5C12.375 117 17.875 126 26.25 133.75C34.625 141.875 44.625 149.625 56.75 154.75C61 156.5 66.125 158.75 71.125 158.875C77.625 159 79.625 155.625 83 155.625C85.875 155.625 87.625 157.875 92.625 157.875C97.875 158 103.125 156.125 108.125 154C117 150.25 124.875 145.375 132 139.25C143 129.75 157 112.5 156.875 87.5C156.875 68.875 148.125 47.5 128.875 39.375Z" fill="#FF2B64"/>
          <path d="M70.5 42.25C69 42.125 68 43.875 70.125 44.5C80.875 48.125 95.125 58.25 99.5 78.25C103.875 98.25 97 118.25 89.125 132.875C86.875 137.25 84.25 141.75 85.625 142.625C86.875 144.25 88.875 141.625 90.25 140.125C97.125 132 106.75 116.25 107.875 95.5C109.375 68.5 93.875 46.125 70.5 42.25Z" fill="#FFA9F1"/>
        </svg>
      </header>

      {tab === "speak" && (
        <SpeakView
          phase={phase}
          shortTap={shortTap}
          statusMsg={statusMsg}
          error={error}
          onPressStart={handlePressStart}
          onPressEnd={handlePressEnd}
          onPressCancel={handlePressCancel}
        />
      )}

      {tab === "timeline" && (
        <TimelineView posts={posts} newPostId={newPostId} />
      )}

      {tab === "mypage" && (
        <MyPageView myEmoji={myEmoji} postCount={posts.length} />
      )}

      <TabBar active={tab} onChange={setTab} compact={scrolled} />
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
