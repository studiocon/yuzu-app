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

  // count 降順で並べる + 総和でシェア率算出
  const ranked = [...data.themes].sort((a, b) => b.count - a.count);
  const total = ranked.reduce((sum, t) => sum + t.count, 0) || 1;

  return (
    <ol className="theme-list">
      {ranked.map((t, i) => {
        const share = t.count / total;
        const sharePct = Math.round(share * 100);
        return (
          <li
            key={`${t.theme}-${i}`}
            className={`theme-card${i === 0 ? " theme-card--lead" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <header className="theme-card-head">
              <span className="theme-card-rank font-display">#{i + 1}</span>
              <h4 className="theme-card-title font-display">{t.theme}</h4>
              <span className="theme-card-share font-display">{sharePct}%</span>
            </header>
            <div
              className="theme-card-bar"
              role="img"
              aria-label={`${sharePct} パーセント`}
            >
              <div
                className="theme-card-bar-fill"
                style={{ width: `${sharePct}%` }}
              />
            </div>
            <p className="theme-card-body">{t.description}</p>
          </li>
        );
      })}
    </ol>
  );
}
