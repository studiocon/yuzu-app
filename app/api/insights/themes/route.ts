import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
// #82: Anthropic 失敗時の negative cache TTL（短く）。
// 連続リロードでの再課金を抑えつつ、5 分後には自然回復するように。
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;

// PATTERN テーマキャッシュは Supabase `theme_cache` に永続化する（#79）。
// in-memory Map は Vercel コールドスタートで消えて Claude を余計に叩くため廃止。
// 読み取りは authenticated クライアント（RLS で自分の行のみ SELECT 可）、
// 書き込みは service_role（admin client）。post_count 変化で自然 invalidate、TTL 24h。
interface RecordRow {
  text: string;
  created_at: string;
}

interface ThemeCacheRow {
  themes: Theme[];
  post_count: number;
  generated_at: string;
  error: string | null;
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

  // キャッシュヒット判定（Supabase 永続キャッシュ。RLS で自分の行のみ読める）
  // - 成功キャッシュ: themes を返す（24h TTL or post_count 変化で invalidate）
  // - 失敗キャッシュ（#82）: 5min は再課金しないため 502 を即返す
  const { data: cached, error: cacheReadError } = await supabase
    .from("theme_cache")
    .select("themes, post_count, generated_at, error")
    .eq("user_id", user.id)
    .maybeSingle<ThemeCacheRow>();
  if (cacheReadError) {
    // 読み取り失敗は致命的にしない。再生成にフォールバックする（silent fail にはしない）。
    console.error("GET /api/insights/themes: cache read", cacheReadError);
  } else if (cached && cached.post_count === total) {
    const ageMs = Date.now() - new Date(cached.generated_at).getTime();
    if (cached.error) {
      if (ageMs < NEGATIVE_CACHE_TTL_MS) {
        return NextResponse.json(
          { error: cached.error, cached: true },
          { status: 502 },
        );
      }
      // negative TTL 経過 → 再試行へフォールスルー
    } else if (ageMs < CACHE_TTL_MS) {
      return NextResponse.json({ themes: cached.themes });
    }
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

  // #82: 失敗時も negative cache に書く helper（ユーザー体験を止めず、再課金だけ防ぐ）
  const admin = createAdminClient();
  const writeCache = async (row: {
    themes: Theme[];
    error: string | null;
  }) => {
    const { error: cacheWriteError } = await admin.from("theme_cache").upsert(
      {
        user_id: user.id,
        themes: row.themes,
        error: row.error,
        post_count: total,
        generated_at: new Date().toISOString(),
        model: MODEL,
      },
      { onConflict: "user_id" },
    );
    if (cacheWriteError) {
      console.error("GET /api/insights/themes: cache write", cacheWriteError);
    }
  };

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
      await writeCache({ themes: [], error: "parse_failed" });
      return NextResponse.json({ error: "parse failed" }, { status: 502 });
    }
    await writeCache({ themes, error: null });
    return NextResponse.json({ themes });
  } catch (e) {
    console.error("GET /api/insights/themes:", e);
    await writeCache({ themes: [], error: "anthropic_call_failed" });
    return NextResponse.json({ error: "anthropic call failed" }, { status: 502 });
  }
}
