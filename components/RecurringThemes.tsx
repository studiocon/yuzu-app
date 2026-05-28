"use client";

import { MIN_POSTS_FOR_THEMES, MOCK_THEMES, type Theme } from "@/lib/themes";
import { useInsightData } from "@/lib/useInsightData";
import type { Post } from "@/lib/types";

type ThemesResult = { themes: Theme[]; notEnough: boolean };

const parseThemes = (r: Record<string, unknown>): ThemesResult => ({
  themes: Array.isArray(r.themes) ? (r.themes as Theme[]) : [],
  notEnough: r.notEnough === true,
});

const computeThemes = (posts: Post[]): ThemesResult =>
  posts.length < MIN_POSTS_FOR_THEMES
    ? { themes: [], notEnough: true }
    : { themes: MOCK_THEMES, notEnough: false };

export default function RecurringThemes({ posts }: { posts: Post[] }) {
  const { data, error } = useInsightData<ThemesResult>({
    endpoint: "/api/insights/themes",
    posts,
    compute: computeThemes,
    parse: parseThemes,
  });

  if (error) return <p className="reports-empty-body">{error}</p>;
  if (data === null) return <p className="reports-empty-body" aria-busy="true">解読中</p>;
  if (data.notEnough) {
    return <p className="reports-empty-body">もっと話せ、パターンが見えてくる</p>;
  }
  if (data.themes.length === 0) {
    return <p className="reports-empty-body">まだパターンがない</p>;
  }

  return (
    <ul className="theme-list">
      {data.themes.map((t, i) => (
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
