import { jstDateString } from "./period";

export const MAX_DAILY_SESSIONS = 3;
export const MAX_RECORD_MS = 3 * 60 * 1000;

const STORAGE_KEY = "yuzu-daily-sessions";

type DailyRecord = { date: string; count: number };

function getRecord(): DailyRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const rec = JSON.parse(raw) as DailyRecord;
      if (rec.date === jstDateString(Date.now())) return rec;
    }
  } catch {}
  return { date: jstDateString(Date.now()), count: 0 };
}

export function getTodayCount(): number {
  return getRecord().count;
}

export function incrementCount(): number {
  const rec = getRecord();
  const next = { date: rec.date, count: rec.count + 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next.count;
}

export function canRecord(): boolean {
  return getRecord().count < MAX_DAILY_SESSIONS;
}
