"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gear } from "@phosphor-icons/react";
import type { User } from "@supabase/supabase-js";
import IndexView from "@/components/IndexView";
import ReadView from "@/components/ReadView";
import OnboardingView from "@/components/OnboardingView";
import RecordModal from "@/components/RecordModal";
import IndexDetailModal from "@/components/IndexDetailModal";
import LoginModal from "@/components/LoginModal";
import TabBar, { type MainTab } from "@/components/TabBar";
import RecordFab from "@/components/RecordFab";
import type { Post } from "@/lib/types";
import { buildMockPosts } from "@/lib/mockPosts";
import { isMockMode } from "@/lib/mockReports";
import { loadSentimentCache, saveSentimentCache } from "@/lib/userClient";
import { MAX_DAILY_SESSIONS, incrementMockCount, getMockTodayCount } from "@/lib/dailyLimit";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { createClient } from "@/lib/supabase/client";
import { usePostsApi } from "@/lib/usePostsApi";
import { useRecorder } from "@/lib/useRecorder";
import SignalCardModal from "@/components/SignalCardModal";

const PENDING_TEXT_KEY = STORAGE_KEYS.pendingText;
const SIGNAL_SHOWN_KEY = STORAGE_KEYS.signalShown;
const MILESTONES = [7, 14, 30, 60, 100, 365];

function checkSignalMilestone(streak: number): boolean {
  if (!MILESTONES.includes(streak)) return false;
  try {
    const shown: number[] = JSON.parse(localStorage.getItem(SIGNAL_SHOWN_KEY) ?? "[]");
    if (shown.includes(streak)) return false;
    localStorage.setItem(SIGNAL_SHOWN_KEY, JSON.stringify([...shown, streak]));
  } catch {
    return false;
  }
  return true;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getString(d: unknown, k: string): string | undefined {
  return isObj(d) && typeof d[k] === "string" ? (d[k] as string) : undefined;
}
function getNumber(d: unknown, k: string): number | undefined {
  return isObj(d) && typeof d[k] === "number" ? (d[k] as number) : undefined;
}
function getPost(d: unknown, k = "post"): Post | undefined {
  if (!isObj(d)) return undefined;
  const v = d[k];
  return isObj(v) && typeof v.id === "string" ? (v as unknown as Post) : undefined;
}
async function safeJson(res: Response): Promise<unknown> {
  try { const t = await res.text(); return t ? JSON.parse(t) : null; } catch { return null; }
}

export default function Home() {
  // ── Auth ──
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading

  // ── UI state ──
  const [recordOpen, setRecordOpen] = useState(false);
  const [lastPost, setLastPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [tab, setTab] = useState<MainTab>("index");
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(0);
  const [signalCard, setSignalCard] = useState<{ streak: number; totalCount: number } | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const openSettings = () => {
    // mock-mode は cookie でマーク済 → middleware がバイパスする
    router.push("/settings");
  };

  // ── Posts API（fetch / pagination / mark / stats） ──
  const postsApi = usePostsApi(user, getMockTodayCount());
  const {
    posts, setPosts, totalCount, setTotalCount,
    totalDurationMs, setTotalDurationMs, serverStreak,
    firstPostAt, setFirstPostAt, todayCount, setTodayCount,
    nextOffset, loadingMore, loadMore, toggleMark,
  } = postsApi;

  // ── Recorder（録音 + STT） ──
  const recorder = useRecorder({
    isAtDailyLimit: () => todayCount >= MAX_DAILY_SESSIONS,
    onTranscribed: async (outcome) => {
      if (outcome.kind === "login_required") {
        setRecordOpen(false);
        setLoginOpen(true);
        return;
      }
      if (outcome.kind !== "text") return; // silence/short/daily_limit/error は recorder 側で処理済

      const text = outcome.text;

      // 未ログイン onboarding: ログインモーダルを促す（save は pending text として保留）
      if (!user) {
        setRecordOpen(false);
        setPendingText(text);
        setPendingDurationMs(outcome.durationMs);
        return;
      }

      // mock mode: API を叩かずクライアント擬似 insert
      if (isMockMode()) {
        const mockPost: Post = {
          id: `mock-${crypto.randomUUID()}`,
          user_id: user.id,
          text,
          char_count: text.length,
          durationMs: outcome.durationMs,
          createdAt: Date.now(),
          index: (posts?.length ?? 0) + 1,
          marked: false,
        };
        setPosts((prev) => [mockPost, ...(prev ?? [])]);
        setLastPost(mockPost);
        setTotalDurationMs((d) => (d ?? 0) + outcome.durationMs);
        setTodayCount(incrementMockCount());
        recorder.setComplete();
        return;
      }

      // 本番: /api/records POST
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, durationMs: outcome.durationMs }),
        });
        const data = await safeJson(res);
        if (!res.ok) {
          const errCode = getString(data, "error");
          if (errCode === "daily_limit") {
            const tc = getNumber(data, "todayCount");
            if (typeof tc === "number") setTodayCount(tc);
            recorder.failWithError(`今日はここまで（${res.status}）`);
            return;
          }
          if (res.status === 401 || errCode === "unauthorized") {
            recorder.failWithError("ログインし直せ（401）");
            return;
          }
          recorder.failWithError(`保存失敗 ${res.status} ${errCode ?? ""}`.trim());
          return;
        }
        const newPost = getPost(data);
        if (!newPost) {
          recorder.failWithError("保存応答が不正");
          return;
        }
        setPosts((prev) => [newPost, ...(prev ?? [])]);
        setLastPost(newPost);
        setTotalCount((t) => Math.max(t ?? 0, newPost.index));
        setTotalDurationMs((d) => (d ?? 0) + newPost.durationMs);
        if (!firstPostAt) setFirstPostAt(newPost.createdAt);
        const tc = getNumber(data, "todayCount");
        if (typeof tc === "number") setTodayCount(tc);
        recorder.setComplete();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "通信失敗";
        recorder.failWithError(msg);
      }
    },
  });

  // ── URL クエリ ?tab=read で初期タブを切替 ──
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "read") setTab("read");
    } catch {}
  }, []);

  // ── 初期化（mock or auth 監視） ──
  useEffect(() => {
    if (isMockMode()) {
      const { posts: mockPosts, sentiments } = buildMockPosts("🍑", "mock-user");
      setPosts(mockPosts);
      setUser({ id: "mock-user" } as User);
      const prev = loadSentimentCache();
      saveSentimentCache({ ...prev, ...sentiments });
      return;
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ログイン直後: sessionStorage の pendingText を /api/records に POST ──
  useEffect(() => {
    if (!user || isMockMode()) return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(PENDING_TEXT_KEY); } catch {}
    if (!raw) return;
    try { sessionStorage.removeItem(PENDING_TEXT_KEY); } catch {}

    // 新形式 {text, durationMs}。旧形式（プレーン文字列）は durationMs=0 で後方互換。
    let pendingText = "";
    let pendingDur = 0;
    try {
      const parsed = JSON.parse(raw);
      if (isObj(parsed) && typeof parsed.text === "string") {
        pendingText = parsed.text;
        pendingDur = typeof parsed.durationMs === "number" ? parsed.durationMs : 0;
      } else {
        pendingText = raw;
      }
    } catch {
      pendingText = raw;
    }
    if (!pendingText) return;

    (async () => {
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pendingText, durationMs: pendingDur }),
        });
        const data = await safeJson(res);
        if (!res.ok) return;
        const newPost = getPost(data);
        if (!newPost) return;
        setPosts([newPost]);
        setLastPost(newPost);
        setTotalCount((t) => Math.max(t ?? 0, newPost.index));
        setTotalDurationMs((d) => (d ?? 0) + newPost.durationMs);
        if (!firstPostAt) setFirstPostAt(newPost.createdAt);
        const tc = getNumber(data, "todayCount");
        if (typeof tc === "number") setTodayCount(tc);
        setPendingText(null);
        recorder.setComplete();
        setRecordOpen(true);
      } catch {/* silent */}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── SIGNAL カード節目検出 ──
  useEffect(() => {
    if (!serverStreak || !totalCount || !user || isMockMode()) return;
    if (checkSignalMilestone(serverStreak)) {
      setSignalCard({ streak: serverStreak, totalCount });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStreak, totalCount]);

  const handleCloseModal = () => {
    setRecordOpen(false);
    recorder.resetIfIdleOrComplete();
    setLastPost(null);
  };

  const handleCompleteDismiss = () => {
    recorder.dismissComplete();
    setLastPost(null);
  };

  const handleOnboardingSave = () => {
    if (pendingText) {
      try {
        sessionStorage.setItem(
          PENDING_TEXT_KEY,
          JSON.stringify({ text: pendingText, durationMs: pendingDurationMs }),
        );
      } catch {}
    }
    setLoginOpen(true);
  };

  const limitReached = todayCount >= MAX_DAILY_SESSIONS;
  const remainingSessions = Math.max(0, MAX_DAILY_SESSIONS - todayCount);

  const myPosts = useMemo<Post[]>(() => posts ?? [], [posts]);
  const isLoaded = user !== undefined;
  const isLoggedIn = user !== null && user !== undefined;
  const isOnboarding = !isLoggedIn;

  return (
    <main
      className="app-shell"
      data-onboarding={isOnboarding ? "" : undefined}
      data-has-tabbar={isLoaded && isLoggedIn ? "" : undefined}
    >
      <header className="app-header">
        <div className="app-header-row">
          {isLoggedIn ? (
            <>
              <span className="app-header-title font-display">
                {tab === "read" ? "INSIGHT." : "LOG."}
              </span>
              <button type="button" className="iconbtn iconbtn--ghost" aria-label="設定" onClick={openSettings}>
                <Gear size={22} weight="bold" />
              </button>
            </>
          ) : null}
        </div>
      </header>

      {!isLoaded ? null : isOnboarding ? (
        <OnboardingView
          onStart={() => setRecordOpen(true)}
          pendingText={pendingText}
          onSave={handleOnboardingSave}
        />
      ) : tab === "read" ? (
        <ReadView myPosts={myPosts} />
      ) : (
        <IndexView
          myPosts={myPosts}
          totalCount={totalCount}
          totalDurationMs={totalDurationMs}
          serverStreak={serverStreak}
          loading={posts === null}
          hasMore={nextOffset !== null}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onOpenDetail={setDetailPost}
          onToggleMark={toggleMark}
        />
      )}

      {isLoaded && isLoggedIn && (
        <>
          <TabBar
            tab={tab}
            onChange={setTab}
            hidden={recordOpen || !!detailPost}
          />
          <RecordFab
            onOpen={() => setRecordOpen(true)}
            recordOpen={recordOpen}
            hidden={recordOpen || !!detailPost}
          />
        </>
      )}

      <IndexDetailModal post={detailPost} firstPostAt={firstPostAt} onClose={() => setDetailPost(null)} />

      <RecordModal
        open={recordOpen}
        onClose={handleCloseModal}
        phase={recorder.phase}
        shortTap={recorder.shortTap}
        statusMsg={recorder.statusMsg}
        error={recorder.error}
        hint={recorder.hint}
        permissionDenied={recorder.permissionDenied}
        analyser={recorder.analyser}
        lastPost={lastPost}
        posts={myPosts}
        totalDurationMs={totalDurationMs}
        serverStreak={serverStreak}
        limitReached={limitReached}
        remainingSessions={remainingSessions}
        recordingElapsed={recorder.recordingElapsed}
        maxRecordMs={recorder.maxRecordMs}
        onPressStart={recorder.onPressStart}
        onPressEnd={recorder.onPressEnd}
        onPressCancel={recorder.onPressCancel}
      />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {signalCard && (
        <SignalCardModal
          streak={signalCard.streak}
          totalCount={signalCard.totalCount}
          onClose={() => setSignalCard(null)}
        />
      )}
    </main>
  );
}
