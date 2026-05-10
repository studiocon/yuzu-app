import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type IncomingPost = { id: string; text: string; createdAt: number };
type Result = { postId: string; date: string; score: number };

const PROMPT = (text: string) =>
  `以下の投稿テキストの感情をスコアで返してください。\n-1.0が最もネガティブ、1.0が最もポジティブです。\nJSONのみ返してください。他の文字は不要です。\n\n投稿: ${text}\n\n{"score": 0.0}`;

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

const parseScore = (raw: string): number => {
  const m = raw.match(/\{[^}]*"score"\s*:\s*(-?\d+(?:\.\d+)?)[^}]*\}/);
  if (m) return clamp(Number(m[1]));
  const d = raw.match(/-?\d+(?:\.\d+)?/);
  if (d) return clamp(Number(d[0]));
  return 0;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  let body: { posts?: IncomingPost[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }
  const posts = Array.isArray(body.posts) ? body.posts : [];
  if (posts.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const client = new Anthropic({ apiKey });

  const results: Result[] = await Promise.all(
    posts.map(async (p): Promise<Result> => {
      const date = formatDate(p.createdAt);
      try {
        const msg = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 64,
          messages: [{ role: "user", content: PROMPT(p.text ?? "") }],
        });
        const text = msg.content
          .map((c) => (c.type === "text" ? c.text : ""))
          .join("");
        return { postId: p.id, date, score: parseScore(text) };
      } catch {
        return { postId: p.id, date, score: 0 };
      }
    })
  );

  return NextResponse.json({ results });
}
