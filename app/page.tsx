"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gear } from "@phosphor-icons/react";
import type { User } from "@supabase/supabase-js";
import IndexView from "@/components/IndexView";
import ReportView from "@/components/ReportView";
import OnboardingView from "@/components/OnboardingView";
import RecordModal from "@/components/RecordModal";
import IndexDetailModal from "@/components/IndexDetailModal";
import LoginModal from "@/components/LoginModal";
import TabBar, { type MainTab } from "@/components/TabBar";
import type { Post } from "@/lib/types";
import { buildMockPosts } from "@/lib/mockPosts";
import { isMockMode } from "@/lib/mockReports";
import { loadSentimentCache, saveSentimentCache } from "@/lib/userClient";
import { MAX_DAILY_SESSIONS, incrementMockCount, getMockTodayCount } from "@/lib/dailyLimit";
import { createClient } from "@/lib/supabase/client";
import { usePostsApi } from "@/lib/usePostsApi";
import { useRecorder } from "@/lib/useRecorder";

const PENDING_TEXT_KEY = "yuzu_pending_text";

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

  const supabase = createClient();
  const router = useRouter();

  const openSettings = () => {
    // mock-mode は cookie でマーク済 → middleware がバイパスする
    router.push("/settings");
  };

  // ── Posts API（fetch / pagination / mark / stats） ──
  const postsApi = usePostsApi(user, getMockTodayCount());
  const {
    posts, setPosts, totalCount, setTotalCount, serverStreak,
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
        return;
      }

      // mock mode: API を叩かずクライアント擬似 insert
      if (isMockMode()) {
        const mockPost: Post = {
          id: `mock-${crypto.randomUUID()}`,
          user_id: user.id,
          text,
          char_count: text.length,
          createdAt: Date.now(),
          index: (posts?.length ?? 0) + 1,
          marked: false,
        };
        setPosts((prev) => [mockPost, ...(prev ?? [])]);
        setLastPost(mockPost);
        setTodayCount(incrementMockCount());
        recorder.setComplete();
        return;
      }

      // 本番: /api/records POST
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await safeJson(res);
        if (!res.ok) {
          if (getString(data, "error") === "daily_limit") {
            const tc = getNumber(data, "todayCount");
            if (typeof tc === "number") setTodayCount(tc);
          }
          // recorder の error は recorder 側 setError で表示済
          return;
        }
        const newPost = getPost(data);
        if (!newPost) return;
        setPosts((prev) => [newPost, ...(prev ?? [])]);
        setLastPost(newPost);
        setTotalCount((t) => Math.max(t ?? 0, newPost.index));
        if (!firstPostAt) setFirstPostAt(newPost.createdAt);
        const tc = getNumber(data, "todayCount");
        if (typeof tc === "number") setTodayCount(tc);
        recorder.setComplete();
      } catch {
        // silent
      }
    },
  });

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
    let pending: string | null = null;
    try { pending = sessionStorage.getItem(PENDING_TEXT_KEY); } catch {}
    if (!pending) return;
    try { sessionStorage.removeItem(PENDING_TEXT_KEY); } catch {}

    (async () => {
      try {
        const res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pending }),
        });
        const data = await safeJson(res);
        if (!res.ok) return;
        const newPost = getPost(data);
        if (!newPost) return;
        setPosts([newPost]);
        setLastPost(newPost);
        setTotalCount((t) => Math.max(t ?? 0, newPost.index));
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
      try { sessionStorage.setItem(PENDING_TEXT_KEY, pendingText); } catch {}
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
          <span className="app-header-spacer" aria-hidden />
          <svg className="app-logo" viewBox="0 0 255 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="YUZU">
            <path d="M0 20.8956C0 11.4394 0 6.71129 2.9482 3.77361C5.8964 0.835938 10.6415 0.835938 20.1316 0.835938H234.868C244.359 0.835938 249.104 0.835938 252.052 3.77361C255 6.71129 255 11.4394 255 20.8956V63.9404C255 73.3966 255 78.1248 252.052 81.0624C249.104 84.0001 244.359 84.0001 234.868 84.0001H20.1316C10.6415 84.0001 5.8964 84.0001 2.9482 81.0624C0 78.1248 0 73.3966 0 63.9404V20.8956Z" fill="#F5D84A"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M95.0898 45.501C95.0899 47.2374 95.3873 48.7411 95.9824 50.0117C96.6201 51.24 97.5764 52.1934 98.8516 52.8711C100.127 53.5487 101.763 53.8876 103.761 53.8877C105.801 53.8877 107.459 53.5698 108.734 52.9346C110.01 52.2569 110.945 51.2823 111.54 50.0117C112.135 48.7411 112.433 47.2374 112.433 45.501V19.7051H128.884V46.3896C128.884 50.8369 127.842 54.7129 125.76 58.0166C123.677 61.3204 120.743 63.9048 116.96 65.7686C113.219 67.5898 108.819 68.5 103.761 68.5C98.745 68.4999 94.3456 67.5898 90.5625 65.7686C86.8217 63.9048 83.8881 61.3204 81.7627 58.0166C79.6799 54.7128 78.6387 50.8369 78.6387 46.3896V19.7051H95.0898V45.501ZM198.306 45.501C198.306 47.2374 198.604 48.7411 199.199 50.0117C199.837 51.2399 200.793 52.1934 202.068 52.8711C203.344 53.5486 204.98 53.8877 206.978 53.8877C209.018 53.8877 210.676 53.5698 211.951 52.9346C213.226 52.2569 214.162 51.2824 214.757 50.0117C215.352 48.7411 215.649 47.2374 215.649 45.501V19.7051H232.101V46.3896C232.101 50.8369 231.059 54.7129 228.977 58.0166C226.894 61.3204 223.96 63.9048 220.177 65.7686C216.436 67.5899 212.036 68.5 206.978 68.5C201.962 68.5 197.562 67.5897 193.779 65.7686C190.039 63.9048 187.105 61.3204 184.979 58.0166C182.897 54.7128 181.855 50.837 181.855 46.3896V19.7051H198.306V45.501ZM178.917 31.2686L153.448 54.7773H179.108V67.3574H131.669V55.7295L157.193 32.2217H131.86V19.6416H178.917V31.2686ZM48.1182 35.708L60.5273 19.7051H78.5723L56.3828 48.1006V67.3564H39.9326V48.3604L17.6152 19.7051H35.6602L48.1182 35.708Z" fill="#1A1A30"/>
          </svg>
          {isLoggedIn ? (
            <button type="button" className="iconbtn iconbtn--ghost" aria-label="設定" onClick={openSettings}>
              <Gear size={22} weight="bold" />
            </button>
          ) : (
            <span className="app-header-spacer" aria-hidden />
          )}
        </div>
      </header>

      {!isLoaded ? null : isOnboarding ? (
        <OnboardingView
          onStart={() => setRecordOpen(true)}
          pendingText={pendingText}
          onSave={handleOnboardingSave}
        />
      ) : tab === "report" ? (
        <ReportView myPosts={myPosts} />
      ) : (
        <IndexView
          myPosts={myPosts}
          totalCount={totalCount}
          serverStreak={serverStreak}
          firstPostAt={firstPostAt}
          hasMore={nextOffset !== null}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onOpenDetail={setDetailPost}
          onToggleMark={toggleMark}
        />
      )}

      {isLoaded && isLoggedIn && (
        <TabBar
          tab={tab}
          onChange={setTab}
          onOpenRecord={() => setRecordOpen(true)}
          recordOpen={recordOpen}
          hidden={recordOpen || !!detailPost}
        />
      )}

      <IndexDetailModal post={detailPost} onClose={() => setDetailPost(null)} />

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
        limitReached={limitReached}
        remainingSessions={remainingSessions}
        recordingElapsed={recorder.recordingElapsed}
        maxRecordMs={recorder.maxRecordMs}
        onPressStart={recorder.onPressStart}
        onPressEnd={recorder.onPressEnd}
        onPressCancel={recorder.onPressCancel}
      />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
