import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { DAY_MS } from "@/lib/period";
import { scoreSentiments } from "@/lib/sentimentScore";
import { buildMockSentimentResults, isMockRequest } from "@/lib/mockFixtures";

export const runtime = "nodejs";

// #40: 1 リクエストあたりの post 上限。Anthropic 課金を保護。
const MAX_POSTS_PER_REQUEST = 50;
// #81 MVP: 課金未導入のため、感情解析は全員「直近 30 日」に限定する。
// 課金導入時 (#65) は plan を見て `if (plan === "free")` で包む。
const SENTIMENT_WINDOW_MS = 30 * DAY_MS;

// #141: クライアントは id のみ渡す。本文は信用せずサーバ側 records から引く。
type IncomingPost = { id: string; createdAt?: number };

// records.id は uuid 型。非 UUID を .in() に渡すと Postgres が型エラーを投げるため、
// 形状が合う id だけを DB に渡す（捏造・不正 id はここで空振りさせる）。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface SentimentRow {
  id: string;
  text: string;
  created_at: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  // #40: 認証必須。オンボーディング経路では呼ばれない。
  const { supabase, user } = await getAuthedClient(req);
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

  // 管理者限定モックモード。Anthropic にも DB にも触れず決定的なスコアを返す。
  // mock の id（mock-01 …）は UUID ではないので、id 検証より前に分岐する。
  if (await isMockRequest(req, supabase, user.id)) {
    return NextResponse.json(buildMockSentimentResults(rawPosts));
  }

  // #141: id 文字列のみ抽出して重複排除。text は受け取らない（捏造防止）。
  const requestedIds = Array.from(
    new Set(rawPosts.map((p) => (typeof p?.id === "string" ? p.id : "")).filter((id) => UUID_RE.test(id))),
  );
  if (requestedIds.length === 0) {
    return NextResponse.json({ results: [] });
  }
  if (requestedIds.length > MAX_POSTS_PER_REQUEST) {
    return NextResponse.json(
      { error: "too_many_posts", max: MAX_POSTS_PER_REQUEST, received: requestedIds.length },
      { status: 400 },
    );
  }

  // #141: 所有権チェック + 本文取得を DB に一本化する。
  // - user_id フィルタで他人の record は引けない（捏造 id は空振り）
  // - 本文はサーバの records（insert 時に MAX_RECORD_TEXT で bounded）を使う
  // - 30 日窓もサーバの created_at で判定し、クライアント createdAt を信用しない
  const cutoffIso = new Date(Date.now() - SENTIMENT_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("records")
    .select("id, text, created_at")
    .eq("user_id", user.id)
    .in("id", requestedIds)
    .gte("created_at", cutoffIso);

  if (error) {
    // silent fail 禁止（CLAUDE.md）。DB エラーを空スコアと混同しない。
    console.error("analyze-sentiment fetch failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const rows = (data as SentimentRow[] | null) ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ results: [] });
  }

  let scoreMap: Record<string, number>;
  try {
    scoreMap = await scoreSentiments(
      rows.map((r) => ({ id: r.id, text: r.text })),
      apiKey,
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("scoreSentiments failed", err);
    return NextResponse.json({ error: "sentiment_failed" }, { status: 502 });
  }

  // 解析できなかった post は results に含めない。クライアントは未キャッシュとして
  // 次回マウント時に再リクエストする。silent fail で 0 を焼き付けない（v1 のバグ修正）。
  const results = rows
    .map((r) => ({
      postId: r.id,
      date: formatDate(new Date(r.created_at).getTime()),
      score: scoreMap[r.id],
    }))
    .filter((r): r is { postId: string; date: string; score: number } => typeof r.score === "number");

  return NextResponse.json({ results });
}
