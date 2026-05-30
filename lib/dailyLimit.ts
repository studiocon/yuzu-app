// 1日上限はサーバ側で強制（複数端末で同期）。
// このファイルは UI から参照する定数と、mock-mode 専用の localStorage フォールバックのみを残す。
//
// 本番フロー:
//   - GET  /api/records → レスポンスに { todayCount, maxDaily, resetAt }
//   - POST /api/records → 上限超過時に 429 + { error:"daily_limit", todayCount, maxDaily, resetAt }

import { jstDateString } from "./period";
import { STORAGE_KEYS } from "./storageKeys";

export { MAX_DAILY_SESSIONS, MAX_RECORD_MS } from "./constants";

// ── mock-mode フォールバック（Supabase に書かない検証フロー専用）──
const MOCK_STORAGE_KEY = STORAGE_KEYS.dailySessions;
type MockRecord = { date: string; count: number };

function getMockRecord(): MockRecord {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const rec = JSON.parse(raw) as MockRecord;
      if (rec.date === jstDateString(Date.now())) return rec;
    }
  } catch {}
  return { date: jstDateString(Date.now()), count: 0 };
}

export function getMockTodayCount(): number {
  return getMockRecord().count;
}

export function incrementMockCount(): number {
  const rec = getMockRecord();
  const next = { date: rec.date, count: rec.count + 1 };
  try { localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(next)); } catch {}
  return next.count;
}
