import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "./supabase/admin";
import { parsePeriodKey, periodLabel, previousPeriodKey, type PeriodKind } from "./period";
import { computeSentimentSeries } from "./sentimentSeries";
import type { Post } from "./types";
import type { Report, ReportPayload } from "./reportTypes";

// Anthropic SDK を import するためクライアントから直接呼ばないこと（CLAUDE.md 参照）

const MODEL = "claude-sonnet-4-6";

// ── Supabase-backed storage ──

interface ReportRow {
  id: string;
  user_id: string;
  period_key: string;
  kind: string;
  range_start: string;
  range_end: string;
  payload: ReportPayload;
  generated_at: string;
  model: string;
}

function normalizePayload(raw: any): ReportPayload {
  return {
    headline: typeof raw?.headline === "string" ? raw.headline : "",
    topics: Array.isArray(raw?.topics) ? raw.topics : [],
    fact: raw?.fact ?? raw?.manifest ?? "",
    proof: raw?.proof ?? "",
    shadow: raw?.shadow ?? raw?.latent ?? "",
    advice: typeof raw?.advice === "string" ? raw.advice : "",
    adviceDetail: typeof raw?.adviceDetail === "string" ? raw.adviceDetail : "",
    sentimentSeries: Array.isArray(raw?.sentimentSeries) ? raw.sentimentSeries : [],
  };
}

function rowToReport(row: ReportRow): Report {
  return {
    user_id: row.user_id,
    periodKey: row.period_key,
    kind: row.kind as PeriodKind,
    rangeStart: new Date(row.range_start).getTime(),
    rangeEnd: new Date(row.range_end).getTime(),
    payload: normalizePayload(row.payload),
    generatedAt: new Date(row.generated_at).getTime(),
    model: row.model,
  };
}

export async function getReport(userId: string, periodKey: string): Promise<Report | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .maybeSingle();
  if (error || !data) return null;
  try {
    return rowToReport(data as ReportRow);
  } catch {
    return null;
  }
}

export async function listReportKeys(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select("period_key")
    .eq("user_id", userId)
    .order("range_end", { ascending: false });
  return (data ?? []).map((r: { period_key: string }) => r.period_key);
}

async function saveReport(report: Report): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("reports").upsert({
    user_id: report.user_id,
    period_key: report.periodKey,
    kind: report.kind,
    range_start: new Date(report.rangeStart).toISOString(),
    range_end: new Date(report.rangeEnd).toISOString(),
    payload: report.payload,
    generated_at: new Date(report.generatedAt).toISOString(),
    model: report.model,
  }, { onConflict: "user_id,period_key" });
}

// ── Anthropic レポート生成 ──

const PROMPT = (
  windowText: string,
  kind: PeriodKind,
  prev?: { shadow: string; topics: string[]; advice: string },
): string => {
  const periodWord = kind === "week" ? "1週間" : "1か月";
  const prevBlock = prev
    ? `【参考：前回レポート】\n前回SHADOW: ${prev.shadow}\n前回TOPICS: ${prev.topics.join(", ")}\n前回ADVICE: ${prev.advice}\n\n`
    : "";
  return `以下は YUZU で記録された ${periodWord} 分の音声日記の書き起こしです。順に読み、その期間を一段抽象化して JSON で返してください。

${prevBlock}${windowText}

出力スキーマ：
{
  "headline": "20文字以内、その期間を一文で表す日本語の見出し",
  "topics": ["3〜5個、その期間でよく話していたテーマやキーワード（短く、名詞句）"],
  "fact": "200〜400文字。投稿に表面的に出ていた感情・状態。具体的な投稿の傾向を引きながら、2〜3段落。段落は\\n\\nで区切る",
  "proof": "100〜250文字。期間中の投稿から、本人が実際に行った・踏みとどまった・続けた行動の事実を1〜3個、評価語を使わず列挙する。該当が無ければ空文字を返す。励ます言葉・賞賛語は禁止",
  "shadow": "200〜400文字。言葉の奥にあったかもしれない、本人がまだ言葉にしていない可能性のある感情・状態。決めつけず可能性として書く。【前回SHADOW・前回TOPICSが与えられている場合】同じテーマ・構造の反復が見られればそれを名指しで指摘すること。反復が無ければ無理に関連付けない。2〜3段落、\\n\\nで区切る",
  "advice": "1文。命令形か問いの形で短く強く。最大20文字程度",
  "adviceDetail": "150〜300文字。adviceの理由と実践方法。【前回ADVICEが与えられている場合】今回の投稿からそれが実行された形跡が読み取れた時のみ一言触れる。読み取れなければ触れない。1〜2段落"
}

サンプルが少ない場合は素直に「判断保留」と書いて構いません。装飾しないこと、励まさないこと、優しくしないこと（YUZU は命令形・断定の世界観）。
JSONのみ返してください。前置きや説明は不要です。`;
};

type RawJson = {
  headline?: unknown;
  topics?: unknown;
  fact?: unknown;
  proof?: unknown;
  shadow?: unknown;
  advice?: unknown;
  adviceDetail?: unknown;
};

function extractJson(raw: string): RawJson | null {
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
  userId: string;
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

  // 二重生成抑止
  const cached = await getReport(args.userId, args.periodKey);
  if (cached) return cached;

  const prevKey = previousPeriodKey(args.periodKey);
  const prevReport = prevKey ? await getReport(args.userId, prevKey) : null;

  const windowText = inRange
    .map((p) => `[${formatJstTimestamp(p.createdAt)}] ${p.text}`)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: PROMPT(
          windowText,
          period.kind,
          prevReport
            ? {
                shadow: prevReport.payload.shadow,
                topics: prevReport.payload.topics,
                advice: prevReport.payload.advice,
              }
            : undefined,
        ),
      },
    ],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = extractJson(text);
  if (!json) throw new Error("report json parse failed");

  const headline = asString(json.headline) || periodLabel(args.periodKey);
  const topics = asTopics(json.topics);
  const fact = asString(json.fact, "判断保留。");
  const proof = asString(json.proof, "");
  const shadow = asString(json.shadow, "判断保留。");
  const advice = asString(json.advice, "話せ。");
  const adviceDetail = asString(json.adviceDetail, "");

  const payload: ReportPayload = {
    headline,
    topics,
    fact,
    proof,
    shadow,
    advice,
    adviceDetail,
    sentimentSeries: computeSentimentSeries(inRange, args.scores),
  };

  const report: Report = {
    user_id: args.userId,
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
