import { parsePeriodKey, recentClosedPeriods } from "./period";
import type { Report, ReportMeta } from "./reportTypes";

const MOCK_KEY = "yuzu-mock-mode";

export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const fromQuery = new URLSearchParams(window.location.search).get("mock") === "1";
  if (fromQuery) {
    try { sessionStorage.setItem(MOCK_KEY, "1"); } catch {}
    return true;
  }
  try { return sessionStorage.getItem(MOCK_KEY) === "1"; } catch { return false; }
}

const SAMPLES: Array<{
  headline: string;
  topics: string[];
  manifest: string;
  latent: string;
  advice: string;
  adviceDetail: string;
}> = [
  {
    headline: "怒りを置きにいった一週間。",
    topics: ["仕事のミーティング", "家族", "寝不足", "通勤"],
    manifest:
      "疲労と苛立ちの語彙が中心の一週間だった。「だるい」「もう無理」「うるさい」といった短く強い言葉が、平日の朝と夜に集中して出ている。火曜のミーティング後と木曜の深夜に最も強い言葉が現れていた。\n\n一方で土曜の散歩や日曜の家族との時間では、声のトーンが落ち着き、文末が長くなる場面もあった。怒りが場面ではなく時間帯に強く紐づいていた一週間と言える。",
    latent:
      "怒りの言葉の裏に「もう判断したくない」という疲弊感がうっすら通っている可能性がある。仕事での要求に「断る」選択肢を最初から外していて、抱えること自体が前提になっているように読める。\n\nまた、家族や同僚への苛立ちも、相手そのものより「自分が休めていないこと」への怒りが投影されているように見える。本人が言葉にしていない核は「休ませてほしい」という願いかもしれない。",
    advice: "来週、一度だけ「断れ」。",
    adviceDetail:
      "全部断れ、ではない。優先度の低い1件だけでいい。判断を放棄せず、自分の側から「やらない」を選ぶ感覚を取り戻すための練習だ。\n\n断った後で罪悪感が出ても、それは健全な反応として記録に残しておくこと。怒りより先に「断れる」を増やす方が、根本の疲弊には早く効く。",
  },
  {
    headline: "凪。たまに笑った。",
    topics: ["散歩", "本", "同僚"],
    manifest:
      "感情の振れ幅が小さい一週間だった。「悪くない」「まあまあ」「特に何もない」という、判断を保留する語彙が多い。前週に比べてネガティブの言葉は減ったが、明確な喜びの記述も少ない。\n\n例外は水曜の同僚との会話と、土曜に読み終えた本についての投稿で、ここでは語数も増え、文末も柔らかくなっていた。日常の中に小さな波が確かに立っていた。",
    latent:
      "穏やかさを評価していない可能性がある。「これでいい」と書いてはいるが、その裏に「これだけでいいのか」という物足りなさが薄く混じっているように読める。\n\n安定を退屈と取り違えると、わざわざ波を起こしにいって自分を消耗させる動きが出やすい。今は意識的に「凪を凪のまま味わう」フェーズかもしれない。",
    advice: "退屈を埋めにいくな。",
    adviceDetail:
      "刺激を探しに行くより、今ある凪を観察に回したほうがいい週だ。散歩や読書のように、自分が落ち着く対象に時間を寄せる方向で十分。\n\n何かを始めるなら、消費ではなく、長く続けられる小さな習慣を一つだけ。派手な変化は今週に必要ない。",
  },
  {
    headline: "出だしから走った。疲れも残った。",
    topics: ["新プロジェクト", "通勤", "睡眠"],
    manifest:
      "前向きな宣言と疲労の訴えが交互に並んだ一週間だった。月曜・火曜は「やってやる」「楽しい」といった攻めの言葉が出ていたが、水曜以降は「眠い」「重い」「朝がきつい」が増えていく。\n\n金曜の夜には満足感のある投稿もあるが、その前後に体調についての言及が挟まる。やる気と消耗が同じ時間軸の上で並走している状態と言える。",
    latent:
      "やる気の裏に、燃え尽きへの予感がうっすらある。新しいプロジェクトを評価される機会と捉え、結果を急ぎたい気持ちが強く出ているように読める。\n\n同時に「ペース配分すべき」という認識自体は持っているのに、それを口にした瞬間に怠けたと感じてしまう自己評価の癖が見える。本当はもう少し休んでいい、と自分に許可が出せていない。",
    advice: "週末、何もしない時間を1つ確保しろ。",
    adviceDetail:
      "30分でも1時間でもいい。スケジュールに「何もしない」と書いて、その時間を約束として守ること。生産性ではなく、回復のための予定だ。\n\nそれを罪悪感なくやれた週は、翌週の集中の質が上がる。走り続ける戦略より、止まれる戦略のほうがこのプロジェクトには効く。",
  },
  {
    headline: "出すより、抱えた月。",
    topics: ["引っ越し", "別れ", "沈黙", "本", "夜"],
    manifest:
      "投稿の総数は維持されているが、一つひとつの語数が短くなった月だった。事実を書いて止まる投稿が増え、感情を名指す言葉は明確に減っている。\n\n中盤の引っ越しと別れに関する投稿では、起きた出来事だけが淡々と並べられ、感想が省かれている。夜の時間帯に書かれた投稿が増えており、言葉になる前の何かを抱えながら一日を閉じていた様子がうかがえる。",
    latent:
      "言葉にしないことを選んでいる可能性がある。整理がついていないというより、整理する前にひとまず置いておく、というモードに入っているように読める。\n\nただし「置いている」という自覚自体が薄い場合、未処理感が漠然とした疲れや焦りとして表に出やすい。何を抱えているのか、輪郭だけでも引いてみると軽くなる余地がある。",
    advice: "整理を急ぐな。並べるだけでいい。",
    adviceDetail:
      "意味づけや結論を出そうとしなくていい。あったこと、感じたかもしれないこと、まだ分からないこと、を順に並べるだけで十分だ。\n\n並べてみて初めて、自分が何にこだわっていたかが見える。今月はその「並べる」だけを来月に渡す準備期間と捉えていい。",
  },
];

function fakeSentimentSeries(start: number, end: number): { date: string; score: number }[] {
  const DAY = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.round((end - start) / DAY));
  const out: { date: string; score: number }[] = [];
  for (let i = 0; i < days; i++) {
    const ts = start + i * DAY;
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
      manifest: s.manifest,
      latent: s.latent,
      advice: s.advice,
      adviceDetail: s.adviceDetail,
      sentimentSeries: fakeSentimentSeries(period.start, period.end),
    },
    generatedAt: Date.now(),
    model: "mock",
  };
}
