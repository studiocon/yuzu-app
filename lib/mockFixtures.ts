// 管理者限定モックモード（ストア用スクショ）のサーバ側フィクスチャ。
// X-Yuzu-Mock: 1 + role=admin のときのみ各 API がこれを返す。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getUserRole } from "./entitlements";
import { DAY_MS, jstDateString, parsePeriodKey, recentClosedPeriods } from "./period";
import type { Report, ReportMeta } from "./reportTypes";
import type { Post } from "./types";

// ── 認証ゲート ──────────────────────────────────────────────
// admin 以外はヘッダを無視（通常動作）。ヘッダが無ければ role 照会もしない（ゼロコスト）。
export async function isMockRequest(
  req: NextRequest,
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (req.headers.get("x-yuzu-mock") !== "1") return false;
  return (await getUserRole(supabase, userId)) === "admin";
}

// ── レポート系フィクスチャ（lib/mockReports.ts から移植。文言は逐語） ──
const SAMPLES: Array<{
  headline: string;
  topics: string[];
  fact: string;
  proof: string;
  shadow: string;
  advice: string;
  adviceDetail: string;
}> = [
  {
    headline: "怒りを置きにいった一週間。",
    topics: ["仕事のミーティング", "家族", "寝不足", "通勤"],
    fact:
      "疲労と苛立ちの語彙が中心の一週間だった。「だるい」「もう無理」「うるさい」といった短く強い言葉が、平日の朝と夜に集中して出ている。火曜のミーティング後と木曜の深夜に最も強い言葉が現れていた。\n\n一方で土曜の散歩や日曜の家族との時間では、声のトーンが落ち着き、文末が長くなる場面もあった。怒りが場面ではなく時間帯に強く紐づいていた一週間と言える。",
    proof:
      "火曜、ミーティングの追加依頼を一度保留にした。土曜は散歩に出た。日曜は家族と過ごす時間を確保した。",
    shadow:
      "怒りの言葉の裏に「もう判断したくない」という疲弊感がうっすら通っている可能性がある。仕事での要求に「断る」選択肢を最初から外していて、抱えること自体が前提になっているように読める。\n\nまた、家族や同僚への苛立ちも、相手そのものより「自分が休めていないこと」への怒りが投影されているように見える。本人が言葉にしていない核は「休ませてほしい」という願いかもしれない。",
    advice: "来週、一度だけ「断れ」。",
    adviceDetail:
      "全部断れ、ではない。優先度の低い1件だけでいい。判断を放棄せず、自分の側から「やらない」を選ぶ感覚を取り戻すための練習だ。\n\n断った後で罪悪感が出ても、それは健全な反応として記録に残しておくこと。怒りより先に「断れる」を増やす方が、根本の疲弊には早く効く。",
  },
  {
    headline: "凪。たまに笑った。",
    topics: ["散歩", "本", "同僚"],
    fact:
      "感情の振れ幅が小さい一週間だった。「悪くない」「まあまあ」「特に何もない」という、判断を保留する語彙が多い。前週に比べてネガティブの言葉は減ったが、明確な喜びの記述も少ない。\n\n例外は水曜の同僚との会話と、土曜に読み終えた本についての投稿で、ここでは語数も増え、文末も柔らかくなっていた。日常の中に小さな波が確かに立っていた。",
    proof: "水曜、同僚と会話した。土曜、本を読み終えた。",
    shadow:
      "穏やかさを評価していない可能性がある。「これでいい」と書いてはいるが、その裏に「これだけでいいのか」という物足りなさが薄く混じっているように読める。\n\n安定を退屈と取り違えると、わざわざ波を起こしにいって自分を消耗させる動きが出やすい。今は意識的に「凪を凪のまま味わう」フェーズかもしれない。",
    advice: "退屈を埋めにいくな。",
    adviceDetail:
      "刺激を探しに行くより、今ある凪を観察に回したほうがいい週だ。散歩や読書のように、自分が落ち着く対象に時間を寄せる方向で十分。\n\n何かを始めるなら、消費ではなく、長く続けられる小さな習慣を一つだけ。派手な変化は今週に必要ない。",
  },
  {
    headline: "出だしから走った。疲れも残った。",
    topics: ["新プロジェクト", "通勤", "睡眠"],
    fact:
      "前向きな宣言と疲労の訴えが交互に並んだ一週間だった。月曜・火曜は「やってやる」「楽しい」といった攻めの言葉が出ていたが、水曜以降は「眠い」「重い」「朝がきつい」が増えていく。\n\n金曜の夜には満足感のある投稿もあるが、その前後に体調についての言及が挟まる。やる気と消耗が同じ時間軸の上で並走している状態と言える。",
    proof: "月曜・火曜、新プロジェクトの作業を進めた。金曜の夜、作業を切り上げて休んだ。",
    shadow:
      "やる気の裏に、燃え尽きへの予感がうっすらある。新しいプロジェクトを評価される機会と捉え、結果を急ぎたい気持ちが強く出ているように読める。\n\n同時に「ペース配分すべき」という認識自体は持っているのに、それを口にした瞬間に怠けたと感じてしまう自己評価の癖が見える。本当はもう少し休んでいい、と自分に許可が出せていない。",
    advice: "週末、何もしない時間を1つ確保しろ。",
    adviceDetail:
      "30分でも1時間でもいい。スケジュールに「何もしない」と書いて、その時間を約束として守ること。生産性ではなく、回復のための予定だ。\n\nそれを罪悪感なくやれた週は、翌週の集中の質が上がる。走り続ける戦略より、止まれる戦略のほうがこのプロジェクトには効く。",
  },
  {
    headline: "出すより、抱えた月。",
    topics: ["引っ越し", "別れ", "沈黙", "本", "夜"],
    fact:
      "投稿の総数は維持されているが、一つひとつの語数が短くなった月だった。事実を書いて止まる投稿が増え、感情を名指す言葉は明確に減っている。\n\n中盤の引っ越しと別れに関する投稿では、起きた出来事だけが淡々と並べられ、感想が省かれている。夜の時間帯に書かれた投稿が増えており、言葉になる前の何かを抱えながら一日を閉じていた様子がうかがえる。",
    proof: "引っ越しの手続きを終えた。投稿は毎日続けた。",
    shadow:
      "言葉にしないことを選んでいる可能性がある。整理がついていないというより、整理する前にひとまず置いておく、というモードに入っているように読める。\n\nただし「置いている」という自覚自体が薄い場合、未処理感が漠然とした疲れや焦りとして表に出やすい。何を抱えているのか、輪郭だけでも引いてみると軽くなる余地がある。",
    advice: "整理を急ぐな。並べるだけでいい。",
    adviceDetail:
      "意味づけや結論を出そうとしなくていい。あったこと、感じたかもしれないこと、まだ分からないこと、を順に並べるだけで十分だ。\n\n並べてみて初めて、自分が何にこだわっていたかが見える。今月はその「並べる」だけを来月に渡す準備期間と捉えていい。",
  },
];

function fakeSentimentSeries(start: number, end: number): { date: string; score: number }[] {
  const days = Math.max(1, Math.round((end - start) / DAY_MS));
  const out: { date: string; score: number }[] = [];
  for (let i = 0; i < days; i++) {
    const ts = start + i * DAY_MS;
    const d = new Date(ts + 9 * 60 * 60 * 1000);
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const score = Math.sin(i * 1.1 + start) * 0.55;
    out.push({ date, score });
  }
  return out;
}

export function buildMockReportMetas(now = Date.now()): ReportMeta[] {
  const periods = recentClosedPeriods(now, 4);
  return periods.map((p, i) => {
    const s = SAMPLES[i % SAMPLES.length];
    return {
      periodKey: p.key,
      kind: p.kind,
      rangeStart: p.start,
      rangeEnd: p.end,
      label: p.label,
      generated: true,
      headline: s.headline,
      topics: s.topics,
      postCount: p.kind === "week" ? 6 : 22,
      // ReportCard の感情スパークライン/左端バー用。実 API も一覧に payload を載せる。
      payload: { ...s, sentimentSeries: fakeSentimentSeries(p.start, p.end) },
    };
  });
}

export function buildMockReport(periodKey: string): Report | null {
  const period = parsePeriodKey(periodKey);
  if (!period) return null;
  const metas = buildMockReportMetas();
  const found = metas.findIndex((m) => m.periodKey === periodKey);
  const idx = found >= 0 ? found : 0;
  const s = SAMPLES[idx % SAMPLES.length];
  return {
    user_id: "mock-user",
    periodKey,
    kind: period.kind,
    rangeStart: period.start,
    rangeEnd: period.end,
    payload: {
      headline: s.headline,
      topics: s.topics,
      fact: s.fact,
      proof: s.proof,
      shadow: s.shadow,
      advice: s.advice,
      adviceDetail: s.adviceDetail,
      sentimentSeries: fakeSentimentSeries(period.start, period.end),
    },
    generatedAt: Date.now(),
    model: "mock",
  };
}

// ── posts 系フィクスチャ（lib/mockPosts.ts から移植） ──
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

function seedId(i: number): string {
  return `mock-${String(i + 1).padStart(2, "0")}`;
}

function timestampFor(seed: Seed, now: Date): number {
  const d = new Date(now);
  d.setDate(d.getDate() - seed.daysAgo);
  d.setHours(seed.hour, seed.minute, 0, 0);
  return d.getTime();
}

// SEEDS が今日から連続何日分埋まっているか（gap day = daysAgo10 で止まる）を数える。
// /api/records の streak（サーバ RPC）と同じ「今日 or 昨日まで続いていれば切れない」意味論を模す。
function computeMockStreak(): number {
  const daysWithPosts = new Set(SEEDS.map((s) => s.daysAgo));
  let streak = 0;
  while (daysWithPosts.has(streak)) streak++;
  return streak;
}

const MOCK_TOTAL_COUNT = SEEDS.length;
const MOCK_TODAY_COUNT = SEEDS.filter((s) => s.daysAgo === 0).length;

// GET /api/records と同じ index 意味論（newest = totalCount、oldest = 1）。SEEDS は古い→新しい順。
export function buildMockPosts(userId: string): Post[] {
  const now = new Date();
  const posts: Post[] = SEEDS.map((seed, i) => ({
    id: seedId(i),
    user_id: userId,
    text: seed.text,
    createdAt: timestampFor(seed, now),
    char_count: seed.text.length,
    durationMs: seed.text.length * 1200,
    index: i + 1,
    marked: false,
  }));
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return posts;
}

// GET /api/records と同じ JST 翌 00:00（リセット時刻）算出。
function jstNextMidnightMs(ts: number): number {
  const midnightIso = new Date(`${jstDateString(ts)}T00:00:00+09:00`).toISOString();
  return new Date(midnightIso).getTime() + DAY_MS;
}

// GET /api/records の JSON 形状を honoring limit/offset で返す。
// 2ページ目以降は実ルートと同じく posts/nextOffset/hasMore のみ（stats は1ページ目限定）。
export function buildMockRecordsResponse(userId: string, limit: number, offset: number) {
  const all = buildMockPosts(userId);
  const total = all.length;
  const isFirstPage = offset === 0;
  const posts = all.slice(offset, offset + limit);
  const hasMore = posts.length === limit && offset + limit < total;
  const nextOffset = hasMore ? offset + limit : null;

  if (!isFirstPage) {
    return { posts, nextOffset, hasMore };
  }

  const firstPostAt = all[all.length - 1]?.createdAt ?? null;
  const totalDurationMs = all.reduce((sum, p) => sum + p.durationMs, 0);

  return {
    posts,
    nextOffset,
    hasMore,
    totalCount: total,
    streak: computeMockStreak(),
    firstPostAt,
    totalDurationMs,
    todayCount: MOCK_TODAY_COUNT,
    maxDaily: null,
    resetAt: jstNextMidnightMs(Date.now()),
  };
}

// POST /api/records の 201 形状。DB には書かない。index = totalCount+1 意味論。
export function buildMockCreatedPost(userId: string, text: string, durationMs: number) {
  const post: Post = {
    id: `mock-created-${Date.now()}`,
    user_id: userId,
    text,
    char_count: text.length,
    durationMs,
    createdAt: Date.now(),
    index: MOCK_TOTAL_COUNT + 1,
    marked: false,
  };
  return {
    post,
    streak: computeMockStreak(),
    todayCount: MOCK_TODAY_COUNT + 1,
    maxDaily: null,
    resetAt: jstNextMidnightMs(Date.now()),
  };
}

// ── センチメント系フィクスチャ ─────────────────────────────
// SEED id は固定スコア、未知 id（実 DB の post 等）は id から決定的にハッシュした値を返す。
function hashScore(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const normalized = (Math.abs(h) % 1000) / 1000; // 0..1
  return (normalized * 2 - 1) * 0.7; // -0.7..0.7
}

function formatDateLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SEED_INDEX_BY_ID = new Map(SEEDS.map((_, i) => [seedId(i), i]));

export function buildMockSentimentResults(
  posts: { id: string; createdAt?: number }[],
): { results: { postId: string; date: string; score: number }[] } {
  const now = new Date();
  const results = posts.map((p) => {
    const seedIdx = SEED_INDEX_BY_ID.get(p.id);
    if (seedIdx !== undefined) {
      return {
        postId: p.id,
        date: formatDateLocal(timestampFor(SEEDS[seedIdx], now)),
        score: SEEDS[seedIdx].score,
      };
    }
    return {
      postId: p.id,
      date: formatDateLocal(p.createdAt ?? Date.now()),
      score: hashScore(p.id),
    };
  });
  return { results };
}

// ── PATTERN（テーマ）フィクスチャ ─────────────────────────
// lib/themes.ts の MOCK_THEMES を再利用（RecurringThemes.tsx の旧クライアント mock と同一ソース）。
export { MOCK_THEMES } from "./themes";

// ── STT フィクスチャ ───────────────────────────────────────
export const MOCK_TRANSCRIBE_TEXT =
  "今日は朝から資料を作り続けて、昼過ぎにようやく一区切りついた。コーヒーを飲みながら少し外を眺めて、午後はそのまま作業に戻った。";
