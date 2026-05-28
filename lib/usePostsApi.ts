"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Post } from "./types";
import { isMockMode } from "./mockReports";

// API response 用の最小型ガード（page.tsx と重複しないようここに集約）
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getNumber(data: unknown, key: string): number | undefined {
  if (!isObj(data)) return undefined;
  const v = data[key];
  return typeof v === "number" ? v : undefined;
}
function getPosts(data: unknown, key = "posts"): Post[] | undefined {
  if (!isObj(data)) return undefined;
  const v = data[key];
  return Array.isArray(v) ? (v as Post[]) : undefined;
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

const PAGE_SIZE = 100;

export type PostsApi = {
  posts: Post[] | null;
  setPosts: React.Dispatch<React.SetStateAction<Post[] | null>>;
  totalCount: number | undefined;
  setTotalCount: React.Dispatch<React.SetStateAction<number | undefined>>;
  totalDurationMs: number | undefined;
  setTotalDurationMs: React.Dispatch<React.SetStateAction<number | undefined>>;
  serverStreak: number | undefined;
  firstPostAt: number | null | undefined;
  setFirstPostAt: React.Dispatch<React.SetStateAction<number | null | undefined>>;
  todayCount: number;
  setTodayCount: React.Dispatch<React.SetStateAction<number>>;
  nextOffset: number | null;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  toggleMark: (post: Post, next: boolean) => Promise<void>;
};

/**
 * 投稿の取得・ページング・MARK トグル・1日上限カウントをまとめる。
 * mock-mode の場合は API を叩かず、posts は呼び出し側で初期化する（mockPosts 経由）。
 */
export function usePostsApi(user: User | null | undefined, initialTodayCount = 0): PostsApi {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [totalDurationMs, setTotalDurationMs] = useState<number | undefined>(undefined);
  const [serverStreak, setServerStreak] = useState<number | undefined>(undefined);
  const [firstPostAt, setFirstPostAt] = useState<number | null | undefined>(undefined);
  const [todayCount, setTodayCount] = useState<number>(initialTodayCount);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // 初回フェッチ（user.id が確定したとき）
  useEffect(() => {
    if (!user || isMockMode()) return;
    let cancelled = false;
    fetch(`/api/records?limit=${PAGE_SIZE}&offset=0`)
      .then(safeJson)
      .then((data) => {
        if (cancelled) return;
        setPosts(getPosts(data) ?? []);
        const tc = getNumber(data, "todayCount");
        if (typeof tc === "number") setTodayCount(tc);
        const total = getNumber(data, "totalCount");
        if (typeof total === "number") setTotalCount(total);
        const totalDur = getNumber(data, "totalDurationMs");
        if (typeof totalDur === "number") setTotalDurationMs(totalDur);
        const streak = getNumber(data, "streak");
        if (typeof streak === "number") setServerStreak(streak);
        const first = getNumber(data, "firstPostAt");
        if (typeof first === "number") setFirstPostAt(first);
        const next = getNumber(data, "nextOffset");
        setNextOffset(typeof next === "number" ? next : null);
      })
      .catch(() => { if (!cancelled) setPosts([]); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadMore = useCallback(async () => {
    if (loadingMore || nextOffset === null) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/records?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const data = await safeJson(res);
      if (!res.ok) return;
      const more = getPosts(data) ?? [];
      setPosts((prev) => [...(prev ?? []), ...more]);
      const next = getNumber(data, "nextOffset");
      setNextOffset(typeof next === "number" ? next : null);
    } catch {
      // silent: 次回 sentinel が再観測すれば再試行可能
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextOffset]);

  const toggleMark = useCallback(async (post: Post, next: boolean) => {
    setPosts((prev) => (prev ?? []).map((p) => (p.id === post.id ? { ...p, marked: next } : p)));
    if (isMockMode()) return;
    try {
      const res = await fetch(`/api/records/${post.id}/mark`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marked: next }),
      });
      if (!res.ok) throw new Error("mark failed");
    } catch {
      // rollback
      setPosts((prev) => (prev ?? []).map((p) => (p.id === post.id ? { ...p, marked: !next } : p)));
    }
  }, []);

  return {
    posts, setPosts,
    totalCount, setTotalCount,
    totalDurationMs, setTotalDurationMs,
    serverStreak,
    firstPostAt, setFirstPostAt,
    todayCount, setTodayCount,
    nextOffset, loadingMore, loadMore,
    toggleMark,
  };
}
