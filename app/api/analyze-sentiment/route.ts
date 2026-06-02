import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DAY_MS } from "@/lib/period";
import { scoreSentiments } from "@/lib/sentimentScore";

export const runtime = "nodejs";

// #40: 1 リクエストあたりの post 上限。Anthropic 課金を保護。
const MAX_POSTS_PER_REQUEST = 50;
// #81 MVP: 課金未導入のため、感情解析は全員「直近 30 日」に限定する。
// 課金導入時 (#65) は plan を見て `if (plan === "free")` で包む。
const SENTIMENT_WINDOW_MS = 30 * DAY_MS;

type IncomingPost = { id: string; text: string; createdAt: number };

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  // #40: 認証必須。オンボーディング経路では呼ばれない。
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { posts?: IncomingPost[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }
  const rawPosts = Array.isArray(body.posts) ? body.posts : [];
  // #81: 30 日より古い post はサーバ側でドロップ。クライアントは未スコアのまま扱う。
  const cutoff = Date.now() - SENTIMENT_WINDOW_MS;
  const posts = rawPosts.filter((p) => typeof p.createdAt === "number" && p.createdAt >= cutoff);
  if (posts.length === 0) {
    return NextResponse.json({ results: [] });
  }
  if (posts.length > MAX_POSTS_PER_REQUEST) {
    return NextResponse.json(
      { error: "too_many_posts", max: MAX_POSTS_PER_REQUEST, received: posts.length },
      { status: 400 },
    );
  }

  const scoreMap = await scoreSentiments(
    posts.map((p) => ({ id: p.id, text: p.text })),
    apiKey,
  );

  const results = posts.map((p) => ({
    postId: p.id,
    date: formatDate(p.createdAt),
    score: scoreMap[p.id] ?? 0,
  }));

  return NextResponse.json({ results });
}
