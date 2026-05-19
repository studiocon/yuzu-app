/**
 * SIGNAL（お知らせ）データレイヤー。
 *
 * 現状はクライアント完結のモック表示。lastReadAt は localStorage に保存し、
 * 通知本体はビルド時固定の MOCK_NOTIFICATIONS から読む。
 *
 * Supabase 移行時の想定スキーマ（参考）:
 *   notifications: id (uuid), title (text), body (text), type (text),
 *                  segment (jsonb), created_at (timestamptz)
 *   notification_targets: notification_id, user_id   -- 個別配信用
 *   notification_reads: user_id, last_read_at        -- 既読時刻
 *
 * 切り替え時はこのファイルの関数本体だけを fetch ベースに差し替え、
 * 呼び出し側（app/signal/*, app/page.tsx）は変更しない。
 */

export type NotifType = "global" | "segment" | "user";

export type SegmentCondition = {
  records?: { gte?: number; eq?: number };
  streak?: { gte?: number; eq?: number };
  day?: { gte?: number; eq?: number };
};

export type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  segment: SegmentCondition | null;
  createdAt: number;
};

const LAST_READ_KEY = "yuzu-signal-last-read-at";

// --- モックデータ -----------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const MOCK_NOTIFICATIONS: NotifItem[] = [
  {
    id: "mock-1",
    title: "DAY 30",
    body: "1ヶ月。本物だ。",
    type: "user",
    segment: null,
    createdAt: now - 0.2 * DAY,
  },
  {
    id: "mock-2",
    title: "V2 RELEASE",
    body: "新機能 V2 リリース。",
    type: "global",
    segment: null,
    createdAt: now - 7 * DAY,
  },
  {
    id: "mock-3",
    title: "DAY 7",
    body: "1週間。続いてる。",
    type: "user",
    segment: null,
    createdAt: now - 23 * DAY,
  },
];

// --- public API ------------------------------------------------------------

export function listNotifications(): NotifItem[] {
  return [...MOCK_NOTIFICATIONS].sort((a, b) => b.createdAt - a.createdAt);
}

export function getNotification(id: string): NotifItem | null {
  return MOCK_NOTIFICATIONS.find((n) => n.id === id) ?? null;
}

export function getLastReadAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = window.localStorage.getItem(LAST_READ_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function clearUnread(): number {
  const ts = Date.now();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LAST_READ_KEY, String(ts));
    } catch {}
  }
  return ts;
}

export function countUnread(): number {
  const lastReadAt = getLastReadAt();
  return listNotifications().filter((n) => n.createdAt > lastReadAt).length;
}
