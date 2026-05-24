import type { Post } from "./types";

// daysAgo: 何日前か（0=今日）, hour, minute
type Seed = {
  daysAgo: number;
  hour: number;
  minute: number;
  text: string;
  score: number;
};

// 14日分 × 20件。Day 10 を意図的にスキップ（streak途切れ検証用）。
// 今日（daysAgo=0）に2件あるので、今日からの連続streakは確保。
const SEEDS: Seed[] = [
  { daysAgo: 13, hour: 23, minute: 11, text: "始めた。何も変わらないと思うけど、とりあえず声に出してる。", score: -0.05 },
  { daysAgo: 12, hour: 8,  minute: 42, text: "朝が重い。布団が地面みたいに張り付いてくる。", score: -0.45 },
  { daysAgo: 12, hour: 22, minute: 30, text: "夜になると少しマシになる。なんでだろう。", score: 0.05 },
  { daysAgo: 11, hour: 13, minute: 5,  text: "コンビニのコーヒー、思ったよりうまかった。", score: 0.35 },
  { daysAgo: 10, hour: 19, minute: 50, text: "今日は最悪。全部うまくいかなかった。寝る。", score: -0.7 },
  { daysAgo: 9,  hour: 9,  minute: 15, text: "電車で泣いてる人がいた。声かけられなかった自分が嫌だ。", score: -0.5 },
  { daysAgo: 9,  hour: 21, minute: 0,  text: "ご飯ちゃんと食べた。それだけで一日として成立する気がする。", score: 0.25 },
  { daysAgo: 8,  hour: 11, minute: 22, text: "穏やか。特に何もない。これでいい。", score: 0.1 },
  { daysAgo: 7,  hour: 16, minute: 40, text: "走った。息が切れて、頭が空になった瞬間がよかった。", score: 0.55 },
  { daysAgo: 6,  hour: 0,  minute: 8,  text: "眠れない。なぜか過去の失敗ばかり再生される。", score: -0.55 },
  { daysAgo: 6,  hour: 18, minute: 33, text: "友達と話した。笑えた。久しぶりに。", score: 0.6 },
  { daysAgo: 5,  hour: 10, minute: 0,  text: "雨。傘忘れた。でもまあ、濡れて歩くのも悪くなかった。", score: 0.15 },
  { daysAgo: 4,  hour: 14, minute: 12, text: "仕事でミスした。怒られた。当然だ。", score: -0.4 },
  { daysAgo: 4,  hour: 23, minute: 45, text: "ミスのこと、まだ引きずってる。でも明日は別の日。", score: -0.1 },
  { daysAgo: 3,  hour: 12, minute: 30, text: "昼休み、空が異常に青かった。立ち止まって見た。", score: 0.45 },
  { daysAgo: 2,  hour: 20, minute: 18, text: "今日はずっと機嫌が良かった。理由はわからない。", score: 0.65 },
  { daysAgo: 1,  hour: 7,  minute: 55, text: "また朝。ただ繰り返してるだけかもしれない。", score: -0.2 },
  { daysAgo: 1,  hour: 22, minute: 10, text: "本物でいろ。それだけは守りたい。", score: 0.3 },
  { daysAgo: 0,  hour: 9,  minute: 30, text: "今日こそ何か残したい。意気込みすぎかな。", score: 0.2 },
  { daysAgo: 0,  hour: 15, minute: 5,  text: "最高、とは言わないけど、悪くない。", score: 0.4 },
];

function timestampFor(seed: Seed, now: Date): number {
  const d = new Date(now);
  d.setDate(d.getDate() - seed.daysAgo);
  d.setHours(seed.hour, seed.minute, 0, 0);
  return d.getTime();
}

export function buildMockPosts(
  _emoji: string,
  userId: string,
): { posts: Post[]; sentiments: Record<string, number> } {
  const now = new Date();
  const posts: Post[] = SEEDS.map((seed, i) => ({
    id: `mock-${String(i + 1).padStart(2, "0")}`,
    user_id: userId,
    text: seed.text,
    createdAt: timestampFor(seed, now),
    char_count: seed.text.length,
    index: i + 1,
    marked: false,
  }));
  posts.sort((a, b) => b.createdAt - a.createdAt);

  const sentiments: Record<string, number> = {};
  for (let i = 0; i < SEEDS.length; i++) {
    sentiments[`mock-${String(i + 1).padStart(2, "0")}`] = SEEDS[i].score;
  }
  return { posts, sentiments };
}
