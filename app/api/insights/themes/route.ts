import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildThemesUserPrompt,
  extractThemesJson,
  MAX_POSTS_FOR_ANALYSIS,
  MIN_POSTS_FOR_THEMES,
  THEMES_SYSTEM_PROMPT,
  type Theme,
} from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// プロセス内キャッシュ。Vercel コンテナが再利用される間は有効。
// 新規投稿で post_count が変われば自然に invalidate される。
// 冷起動時は再計算（ユーザー1人あたり最大1回の Claude 呼び出しコスト）。
type CacheEntry = { themes: Theme[]; postCount: number; at: number };
const cache = new Map<string, CacheEntry>();

interface RecordRow {
  text: string;
  created_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 投稿数チェック
  const { count: totalCount } = await supabase
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const total = totalCount ?? 0;

  if (total < MIN_POSTS_FOR_THEMES) {
    return NextResponse.json({ themes: [], notEnough: true, needed: MIN_POSTS_FOR_THEMES });
  }

  // キャッシュヒット判定
  const cached = cache.get(user.id);
  if (cached && cached.postCount === total && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ themes: cached.themes });
  }

  // 最新 50 件まで取得
  const { data, error } = await supabase
    .from("records")
    .select("text, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_POSTS_FOR_ANALYSIS);

  if (error) {
    console.error("GET /api/insights/themes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = ((data ?? []) as RecordRow[]).map((r) => ({ text: r.text }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: THEMES_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildThemesUserPrompt(posts) }],
    });
    const raw = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const themes = extractThemesJson(raw);
    if (!themes) {
      console.error("GET /api/insights/themes: parse failed", raw.slice(0, 500));
      return NextResponse.json({ error: "parse failed" }, { status: 502 });
    }
    cache.set(user.id, { themes, postCount: total, at: Date.now() });
    return NextResponse.json({ themes });
  } catch (e) {
    console.error("GET /api/insights/themes:", e);
    return NextResponse.json({ error: "anthropic call failed" }, { status: 502 });
  }
}
