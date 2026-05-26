import type { SentimentPoint } from "./sentimentSeries";
import { jstDateString } from "./period";

// データが揃う前のプレビュー用ダミー系列。
// 起伏のある曲線を出すための固定スコアパターン。
const DUMMY_PATTERN = [0.2, -0.3, 0.5, 0.1, -0.4, 0.3, 0.6];

export function buildDummySentiment(days = 7): SentimentPoint[] {
  const today = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  return Array.from({ length: days }, (_, i) => ({
    date: jstDateString(today - (days - 1 - i) * DAY_MS),
    score: DUMMY_PATTERN[i % DUMMY_PATTERN.length],
  }));
}
