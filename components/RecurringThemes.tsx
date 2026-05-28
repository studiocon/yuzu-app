"use client";

import { useEffect, useState } from "react";
import { isMockMode } from "@/lib/mockReports";
import { MIN_POSTS_FOR_THEMES, MOCK_THEMES, type Theme } from "@/lib/themes";
import type { Post } from "@/lib/types";

type Response = { themes?: Theme[]; notEnough?: boolean; needed?: number };

export default function RecurringThemes({ posts }: { posts: Post[] }) {
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [notEnough, setNotEnough] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode()) {
      if (posts.length < MIN_POSTS_FOR_THEMES) {
        setThemes([]);
        setNotEnough(true);
      } else {
        setThemes(MOCK_THEMES);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/insights/themes");
        if (!res.ok) {
          if (!cancelled) setError("失敗、話せ");
          return;
        }
        const data = (await res.json()) as Response;
        if (cancelled) return;
        if (data.notEnough) {
          setThemes([]);
          setNotEnough(true);
          return;
        }
        setThemes(Array.isArray(data.themes) ? data.themes : []);
      } catch (e) {
        console.error("RecurringThemes fetch:", e);
        if (!cancelled) setError("失敗、話せ");
      }
    })();
    return () => { cancelled = true; };
  }, [posts]);

  if (error) return <p className="reports-empty-body">{error}</p>;
  if (themes === null) return <p className="reports-empty-body" aria-busy="true">解読中</p>;
  if (notEnough) {
    return <p className="reports-empty-body">もっと話せ、パターンが見えてくる</p>;
  }
  if (themes.length === 0) {
    return <p className="reports-empty-body">まだパターンがない</p>;
  }

  return (
    <ul className="theme-list">
      {themes.map((t, i) => (
        <li
          key={`${t.theme}-${i}`}
          className="theme-card"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <header className="theme-card-head">
            <h4 className="theme-card-title font-display">{t.theme}</h4>
            <span className="theme-card-count font-display">×{t.count}</span>
          </header>
          <p className="theme-card-body">{t.description}</p>
        </li>
      ))}
    </ul>
  );
}
