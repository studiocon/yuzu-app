"use client";

import { MIN_POSTS_FOR_THEMES, MOCK_THEMES, type Theme } from "@/lib/themes";
import { useInsightData } from "@/lib/useInsightData";
import type { Post } from "@/lib/types";
import InsightFallback from "./InsightFallback";

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

  if (error) return <InsightFallback state="error" message={error} />;
  if (data === null) {
    return (
      <ol className="theme-list" aria-busy="true" aria-label="読み取り中">
        {[0, 1, 2].map((i) => (
          <li key={i} className="theme-card theme-card-skeleton">
            <div className="theme-card-head">
              <span className="skeleton-block skeleton-block--rank" />
              <span className="skeleton-block skeleton-block--theme-title" />
              <span className="skeleton-block skeleton-block--share" />
            </div>
            <div className="skeleton-block skeleton-block--theme-bar" />
            <div className="skeleton-block skeleton-block--line" />
          </li>
        ))}
      </ol>
    );
  }
  if (data.notEnough) return <InsightFallback state="empty" message="もっと話せ、パターンが見えてくる" />;
  if (data.themes.length === 0) return <InsightFallback state="empty" message="まだパターンがない" />;

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
