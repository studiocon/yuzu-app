import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildThemesUserPrompt,
  extractThemesJson,
  MAX_POSTS_FOR_ANALYSIS,
  MIN_POSTS_FOR_THEMES,
  THEMES_SYSTEM_PROMPT,
  type Theme,
} from "@/lib/themes";
import { isMockRequest, MOCK_THEMES } from "@/lib/mockFixtures";
import { getEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// テーマ抽出は分類タスクであり Haiku 4.5 で品質十分。PATTERN は Claude コストの最大項目のため、
// Sonnet（$3/$15）から Haiku（$1/$5）へ切替してコストを抑える。
const MODEL = "claude-haiku-4-5";
// #82: Anthropic 失敗時の negative cache TTL（短く）。
// 連続リロードでの再課金を抑えつつ、5 分後には自然回復するように。
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;
// records は編集・削除不可（INDEX 永久欠番）なので post_count が同じなら入力は完全に同一。
// 「3投稿以上たまった」らまとまった差分として再生成する閾値。
const REGEN_POST_THRESHOLD = 3;
// 新投稿が1〜2件だけある場合でも、7日以上経過していれば内容の陳腐化を許容せず再生成する。
const REGEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// PATTERN テーマキャッシュは Supabase `theme_cache` に永続化する（#79）。
// in-memory Map は Vercel コールドスタートで消えて Claude を余計に叩くため廃止。
// 読み取りは authenticated クライアント（RLS で自分の行のみ SELECT 可）、
// 書き込みは service_role（admin client）。post_count が同一なら入力も同一（records は削除不可）
// なので無条件でキャッシュを返し、増分と経過時間から再生成要否を判定する（下記 REGEN_* 定数）。
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

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 管理者限定モックモード。theme_cache / Anthropic に触れず固定テーマを返す。
  if (await isMockRequest(request, supabase, user.id)) {
    return NextResponse.json({ themes: MOCK_THEMES });
  }

  // PATTERN（PLUS 限定機能）のプランゲート。theme_cache を読む前に弾く（cache read-around 防止）。
  const ent = await getEntitlements(supabase, user.id, request);
  if (!ent.canUseThemes) {
    return NextResponse.json({ error: "plan_required" }, { status: 403 });
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
  // - 失敗キャッシュ（#82）: 5min は再課金しないため 502 を即返す
  // - 成功キャッシュ: post_count の増分と経過時間から再生成要否を判定（下記 stale 判定）
  const { data: cached, error: cacheReadError } = await supabase
    .from("theme_cache")
    .select("themes, post_count, generated_at, error")
    .eq("user_id", user.id)
    .maybeSingle<ThemeCacheRow>();
  if (cacheReadError) {
    // 読み取り失敗は致命的にしない。再生成にフォールバックする（silent fail にはしない）。
    console.error("GET /api/insights/themes: cache read", cacheReadError);
  } else if (cached) {
    const ageMs = Date.now() - new Date(cached.generated_at).getTime();
    if (cached.error) {
      if (ageMs < NEGATIVE_CACHE_TTL_MS) {
        return NextResponse.json(
          { error: cached.error, cached: true },
          { status: 502 },
        );
      }
      // negative TTL 経過 → 再試行へフォールスルー
    } else {
      // records は削除不可なので通常 diff >= 0（diff < 0 は想定外の状態としてフォールスルーし再生成）。
      const diff = total - cached.post_count;
      // 再生成するのは「3投稿以上たまった」か「新投稿があり7日以上経過」の時だけ。
      // diff === 0 は入力が同一なので TTL に関係なく常にキャッシュを返す（従来の24h再生成は無駄だった）。
      const stale =
        diff >= REGEN_POST_THRESHOLD || diff < 0 || (diff > 0 && ageMs > REGEN_MAX_AGE_MS);
      if (!stale) {
        return NextResponse.json({ themes: cached.themes });
      }
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
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
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
