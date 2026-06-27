// JST 固定で週/月の境界を扱うユーティリティ。
// 週は日曜始まり。境界は JST 0:00。

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type PeriodKind = "week" | "month";
export type PeriodMeta = {
  key: string;
  kind: PeriodKind;
  start: number;
  end: number;
  label: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function jstParts(ts: number): { y: number; m: number; d: number; dow: number } {
  const d = new Date(ts + JST_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
}

function jstMidnightUtc(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) - JST_OFFSET_MS;
}

export function jstSundayStart(ts: number): number {
  const { y, m, d, dow } = jstParts(ts);
  return jstMidnightUtc(y, m, d) - dow * DAY_MS;
}

export function jstMonthStart(ts: number): number {
  const { y, m } = jstParts(ts);
  return jstMidnightUtc(y, m, 1);
}

function weekKeyFromStart(startTs: number): string {
  const { y, m, d } = jstParts(startTs);
  return `w-${y}-${pad2(m)}-${pad2(d)}`;
}

export function weekKey(ts: number): string {
  return weekKeyFromStart(jstSundayStart(ts));
}

export function monthKey(ts: number): string {
  const { y, m } = jstParts(ts);
  return `m-${y}-${pad2(m)}`;
}

export function parsePeriodKey(
  key: string,
): { kind: PeriodKind; start: number; end: number } | null {
  const w = key.match(/^w-(\d{4})-(\d{2})-(\d{2})$/);
  if (w) {
    const start = jstMidnightUtc(+w[1], +w[2], +w[3]);
    return { kind: "week", start, end: start + 7 * DAY_MS };
  }
  const m = key.match(/^m-(\d{4})-(\d{2})$/);
  if (m) {
    const y = +m[1];
    const mm = +m[2];
    const start = jstMidnightUtc(y, mm, 1);
    const nextY = mm === 12 ? y + 1 : y;
    const nextM = mm === 12 ? 1 : mm + 1;
    return { kind: "month", start, end: jstMidnightUtc(nextY, nextM, 1) };
  }
  return null;
}

export function isClosed(key: string, now = Date.now()): boolean {
  const p = parsePeriodKey(key);
  return p ? p.end <= now : false;
}

export function periodLabel(key: string): string {
  const w = key.match(/^w-(\d{4})-(\d{2})-(\d{2})$/);
  if (w) {
    const month = +w[2];
    const day = +w[3];
    const wn = Math.floor((day - 1) / 7) + 1;
    return `${month}月${wn}週 週次レポート`;
  }
  const m = key.match(/^m-(\d{4})-(\d{2})$/);
  if (m) return `${+m[2]}月 月次レポート`;
  return key;
}

// 直近 weeks 週分の確定済み週レポート + 直近 1 か月の確定済み月レポート。
// 「進行中の週/月」は含めない。end 降順。
export function recentClosedPeriods(
  now = Date.now(),
  weeks = 4,
): PeriodMeta[] {
  const out: PeriodMeta[] = [];
  const thisSundayStart = jstSundayStart(now);

  for (let i = 1; i <= weeks; i++) {
    const start = thisSundayStart - i * 7 * DAY_MS;
    const end = start + 7 * DAY_MS;
    if (end > now) continue;
    const key = weekKeyFromStart(start);
    out.push({ key, kind: "week", start, end, label: periodLabel(key) });
  }

  const thisMonthStart = jstMonthStart(now);
  // 前月最終日の JST 部分を読んで前月の y/m を取得
  const prevDay = jstParts(thisMonthStart - DAY_MS);
  const prevStart = jstMidnightUtc(prevDay.y, prevDay.m, 1);
  const prevEnd = thisMonthStart;
  if (prevEnd <= now) {
    const key = `m-${prevDay.y}-${pad2(prevDay.m)}`;
    out.push({ key, kind: "month", start: prevStart, end: prevEnd, label: periodLabel(key) });
  }

  return out.sort((a, b) => b.end - a.end);
}

// 投稿の createdAt を YYYY-MM-DD（JST）に整形
export function jstDateString(ts: number): string {
  const { y, m, d } = jstParts(ts);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

// レポートカードの期間スパン表示（JST）。end は排他境界なので最終日は end - DAY_MS。
// week → "M/D–M/D"（例 6/8–6/14）、month → "M月"（例 6月）。
export function formatPeriodRange(start: number, end: number, kind: PeriodKind): string {
  if (kind === "month") {
    const { m } = jstParts(start);
    return `${m}月`;
  }
  const s = jstParts(start);
  const e = jstParts(end - DAY_MS);
  return `${s.m}/${s.d}–${e.m}/${e.d}`;
}

// 投稿の createdAt を JST の 0〜23 時で返す
export function jstHour(ts: number): number {
  const d = new Date(ts + JST_OFFSET_MS);
  return d.getUTCHours();
}
