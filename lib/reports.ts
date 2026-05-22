import Anthropic from "@anthropic-ai/sdk";
import { getRedis } from "./kv";
import { parsePeriodKey, periodLabel, type PeriodKind } from "./period";
import { computeSentimentSeries } from "./sentimentSeries";
import type { Post } from "./types";
import type { Report, ReportPayload } from "./reportTypes";

const MODEL = "claude-sonnet-4-6";

const reportKey = (sid: string, key: string) => `report:${sid}:${key}`;
const reportZset = (sid: string) => `reports:${sid}`;

export async function getReport(sid: string, key: string): Promise<Report | null> {
  const r = await getRedis();
  const raw = await r.hGetAll(reportKey(sid, key));
  if (!raw || Object.keys(raw).length === 0) return null;
  try {
    return {
      sessionId: sid,
      periodKey: key,
      kind: raw.kind as PeriodKind,
      rangeStart: Number(raw.rangeStart),
      rangeEnd: Number(raw.rangeEnd),
      payload: JSON.parse(String(raw.payload)) as ReportPayload,
      generatedAt: Number(raw.generatedAt),
      model: String(raw.model ?? ""),
    };
  } catch {
    return null;
  }
}

export async function listReportKeys(sid: string): Promise<string[]> {
  const r = await getRedis();
  return await r.zRange(reportZset(sid), 0, -1, { REV: true });
}

async function saveReport(report: Report): Promise<void> {
  const r = await getRedis();
  await r.hSet(reportKey(report.sessionId, report.periodKey), {
    kind: report.kind,
    rangeStart: String(report.rangeStart),
    rangeEnd: String(report.rangeEnd),
    payload: JSON.stringify(report.payload),
    generatedAt: String(report.generatedAt),
    model: report.model,
  });
  await r.zAdd(reportZset(report.sessionId), {
    score: report.rangeEnd,
    value: report.periodKey,
  });
}

const PROMPT = (windowText: string, kind: PeriodKind): string => {
  const periodWord = kind === "week" ? "1週間" : "1か月";
  return `以下は YUZU で記録された ${periodWord} 分の音声日記の書き起こしです。順に読み、その期間を一段抽象化して JSON で返してください。

${windowText}

出力スキーマ：
{
  "headline": "20文字以内、その期間を一文で表す日本語の見出し",
  "topics": ["3〜5個、その期間でよく話していたテーマやキーワード（短く、名詞句）"],
  "manifest": "200〜400文字。投稿に表面的に出ていた感情・状態。具体的な投稿の傾向を引きながら、2〜3段落に分けて書く。段落は空行（\\n\\n）で区切る",
  "latent": "200〜400文字。言葉の奥にあったかもしれない、本人がまだ言葉にしていない可能性のある感情・状態。決めつけず可能性として書く。2〜3段落に分け、段落は \\n\\n で区切る",
  "advice": "1文。命令形か問いの形で短く強く。最大20文字程度",
  "adviceDetail": "150〜300文字。advice をなぜ言っているのか、どう実践すればよいかを補足する。1〜2段落、段落は \\n\\n で区切る"
}

サンプルが少ない場合は素直に「判断保留」と書いて構いません。装飾しないこと、励まさないこと、優しくしないこと（YUZU は命令形・断定の世界観）。
JSONのみ返してください。前置きや説明は不要です。`;
};

type RawJson = {
  headline?: unknown;
  topics?: unknown;
  manifest?: unknown;
  latent?: unknown;
  advice?: unknown;
  adviceDetail?: unknown;
};

function extractJson(raw: string): RawJson | null {
  // 最初の { から最後の } までを取り出す（モデルが余計な文字を返した場合の保険）
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s < 0 || e < 0 || e <= s) return null;
  try {
    return JSON.parse(raw.slice(s, e + 1)) as RawJson;
  } catch {
    return null;
  }
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function asTopics(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x): x is string => x.length > 0)
    .slice(0, 6);
}

function formatJstTimestamp(ts: number): string {
  const d = new Date(ts + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export async function generateReport(args: {
  sessionId: string;
  periodKey: string;
  posts: Post[];
  scores: Record<string, number>;
}): Promise<Report> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const period = parsePeriodKey(args.periodKey);
  if (!period) throw new Error("invalid period key");

  const inRange = args.posts
    .filter((p) => p.createdAt >= period.start && p.createdAt < period.end)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (inRange.length === 0) throw new Error("no posts in range");

  // 二重生成抑止: ロック前にもう一度確認
  const cached = await getReport(args.sessionId, args.periodKey);
  if (cached) return cached;

  const windowText = inRange
    .map((p) => `[${formatJstTimestamp(p.createdAt)}] ${p.text}`)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: PROMPT(windowText, period.kind) }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = extractJson(text);
  if (!json) throw new Error("report json parse failed");

  const headline = asString(json.headline) || periodLabel(args.periodKey);
  const topics = asTopics(json.topics);
  const manifest = asString(json.manifest, "判断保留。");
  const latent = asString(json.latent, "判断保留。");
  const advice = asString(json.advice, "話せ。");
  const adviceDetail = asString(json.adviceDetail, "");

  const payload: ReportPayload = {
    headline,
    topics,
    manifest,
    latent,
    advice,
    adviceDetail,
    sentimentSeries: computeSentimentSeries(inRange, args.scores),
  };

  const report: Report = {
    sessionId: args.sessionId,
    periodKey: args.periodKey,
    kind: period.kind,
    rangeStart: period.start,
    rangeEnd: period.end,
    payload,
    generatedAt: Date.now(),
    model: MODEL,
  };
  await saveReport(report);
  return report;
}
