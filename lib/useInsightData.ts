"use client";

import { useEffect, useState } from "react";
import { isMockMode } from "./mockReports";
import type { Post } from "./types";

type Options<T> = {
  endpoint: string;
  posts: Post[];
  // mock mode 時のローカル計算（Claude 等を呼べない場合の fallback）
  compute: (posts: Post[]) => T;
  // 本番レスポンスから T を取り出す。複数フィールドを参照したい場合に使う
  parse: (payload: Record<string, unknown>) => T;
  errorMessage?: string;
};

// INSIGHT セクションの fetch/mock 共通パターン。
// silent fail させない（CLAUDE.md 規約）。失敗は error 文字列で UI に出す。
export function useInsightData<T>({
  endpoint,
  posts,
  compute,
  parse,
  errorMessage = "失敗、話せ",
}: Options<T>): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode()) {
      setData(compute(posts));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          if (!cancelled) setError(errorMessage);
          return;
        }
        const payload = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        setData(parse(payload));
      } catch (e) {
        console.error(`useInsightData(${endpoint}):`, e);
        if (!cancelled) setError(errorMessage);
      }
    })();
    return () => { cancelled = true; };
    // compute / parse はキャプチャ依存。再計算したい場合は posts/endpoint が変わる時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, posts]);

  return { data, error };
}
