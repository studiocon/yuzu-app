import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 入力上限（migration の CHECK 制約と一致させる）
const SUBJECT_MAX = 200;
const BODY_MAX = 4000;

// レート制限：直近 1 時間に同一 user_id (or IP) で N 件まで
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

interface CreateBody {
  subject?: unknown;
  body?: unknown;
  email?: unknown;
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  const real = req.headers.get("x-real-ip");
  return real ?? null;
}

async function notifySlack(payload: {
  id: string;
  subject: string;
  body: string;
  email: string | null;
  userId: string | null;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return; // 未設定なら通知スキップ（dev 環境想定）
  const text =
    `<!here> :lemon: *YUZU からの問い合わせ*\n` +
    `*Subject*: ${payload.subject}\n` +
    `*From*: ${payload.email ?? "(no email)"} / user_id: ${payload.userId ?? "(anon)"}\n` +
    `*ID*: \`${payload.id}\`\n` +
    "```\n" +
    payload.body.slice(0, 1000) +
    (payload.body.length > 1000 ? "\n...(truncated)" : "") +
    "\n```";
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    // Slack 失敗で保存自体は壊さない。ログだけ残す（silent でなく明示的にログ）。
    console.error("Slack webhook failed:", e);
  }
}

export async function POST(request: NextRequest) {
  // 認証は任意。ログイン済みなら user_id を埋める、未ログインなら null。
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let payload: CreateBody = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const emailRaw = typeof payload.email === "string" ? payload.email.trim() : "";
  // 簡易 email 形式チェック（厳密でなくて良い・最終確認は kyota が目視）
  const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;

  if (!subject || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (subject.length > SUBJECT_MAX || body.length > BODY_MAX) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  // ── レート制限（service_role で全件参照、user_id / email で過去 1h を数える）──
  const admin = createAdminClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const rateKey = user?.id ?? email ?? clientIp(request);
  if (rateKey) {
    let query = admin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if (user?.id) {
      query = query.eq("user_id", user.id);
    } else if (email) {
      query = query.eq("email", email);
    }
    // IP のみのケースはテーブルに列がないのでスキップ（abuse 完全阻止は別途 Vercel WAF 等）
    if (user?.id || email) {
      const { count } = await query;
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: "rate_limited", retryAfterMs: RATE_LIMIT_WINDOW_MS },
          { status: 429 },
        );
      }
    }
  }

  // ── 保存 ──
  // 注意：anon ロールは INSERT 列レベル grant のみで table SELECT 権限がないため、
  // `.insert().select()` の chained SELECT が permission denied で落ちる。
  // ここは RLS バイパスして admin で書き込み、user_id はサーバ側で getUser() の結果から付ける。
  const { data: inserted, error: insertError } = await admin
    .from("inquiries")
    .insert({
      user_id: user?.id ?? null,
      email: email ?? user?.email ?? null,
      subject,
      body,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("POST /api/inquiries:", insertError);
    return NextResponse.json(
      { error: insertError?.message ?? "insert_failed" },
      { status: 500 },
    );
  }

  // ── Slack 通知（失敗しても 201 を返す）──
  await notifySlack({
    id: inserted.id as string,
    subject,
    body,
    email: email ?? user?.email ?? null,
    userId: user?.id ?? null,
  });

  return NextResponse.json({ id: inserted.id, ok: true }, { status: 201 });
}
