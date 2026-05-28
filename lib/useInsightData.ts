"use client";

import { useEffect, useState } from "react";
import { isMockMode } from "./mockReports";
import type { Post } from "./types";

// INSIGHT セクションの fetch/mock 共通パターン。
// - mock mode: posts から compute() で即時生成
// - 本番: endpoint から GET して { [responseKey]: T } を取り出す
//
// silent fail させない（CLAUDE.md 規約）。失敗は error 文字列で UI に出す。
export function useInsightData<T>(
  endpoint: string,
  posts: Post[],
  compute: (posts: Post[]) => T,
  responseKey: string,
  errorMessage = "失敗、話せ",
): { data: T | null; error: string | null } {
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
        const value = payload[responseKey];
        setData((value as T) ?? null);
      } catch (e) {
        console.error(`useInsightData(${endpoint}):`, e);
        if (!cancelled) setError(errorMessage);
      }
    })();
    return () => { cancelled = true; };
    // compute はキャプチャ依存。再計算したい場合は posts/endpoint が変わる時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, posts, responseKey]);

  return { data, error };
}
