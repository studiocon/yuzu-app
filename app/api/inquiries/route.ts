import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { postSlack } from "@/lib/slack";
import {
  INQUIRY_SUBJECT_MAX,
  INQUIRY_BODY_MAX,
  INQUIRY_RATE_WINDOW_MS,
  INQUIRY_RATE_MAX,
  isLooselyValidEmail,
} from "@/lib/inquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  subject?: unknown;
  body?: unknown;
  email?: unknown;
}

function buildSlackText(p: {
  id: string;
  subject: string;
  body: string;
  email: string | null;
  userId: string | null;
}): string {
  const bodyPreview =
    p.body.slice(0, 1000) + (p.body.length > 1000 ? "\n...(truncated)" : "");
  return (
    `<!here> :lemon: *YUZU からの問い合わせ*\n` +
    `*Subject*: ${p.subject}\n` +
    `*From*: ${p.email ?? "(no email)"} / user_id: ${p.userId ?? "(anon)"}\n` +
    `*ID*: \`${p.id}\`\n` +
    "```\n" +
    bodyPreview +
    "\n```"
  );
}

// 直近 INQUIRY_RATE_WINDOW_MS 内の件数を user_id か email で数える。
// IP のみのケースはテーブルに列がないので未対応（abuse 完全阻止は Vercel WAF 等の外側で）。
async function countRecent(
  admin: ReturnType<typeof createAdminClient>,
  key: { userId?: string | null; email?: string | null },
): Promise<number> {
  if (!key.userId && !key.email) return 0;
  const since = new Date(Date.now() - INQUIRY_RATE_WINDOW_MS).toISOString();
  let q = admin
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (key.userId) q = q.eq("user_id", key.userId);
  else if (key.email) q = q.eq("email", key.email);
  const { count } = await q;
  return count ?? 0;
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
  const email = emailRaw && isLooselyValidEmail(emailRaw) ? emailRaw : null;

  if (!subject || !body) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (subject.length > INQUIRY_SUBJECT_MAX || body.length > INQUIRY_BODY_MAX) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── レート制限 ──
  const recent = await countRecent(admin, { userId: user?.id, email });
  if (recent >= INQUIRY_RATE_MAX) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: INQUIRY_RATE_WINDOW_MS },
      { status: 429 },
    );
  }

  // ── 保存 ──
  // 注意：anon ロールは INSERT 列レベル grant のみで table SELECT 権限がないため、
  // `.insert().select()` の chained SELECT が permission denied で落ちる。
  // ここは admin（service_role）で書き込み、user_id はサーバ側 getUser() の結果から付ける。
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
      { error: "insert_failed" },
      { status: 500 },
    );
  }

  // ── Slack 通知（失敗しても 201 を返す）──
  await postSlack(
    buildSlackText({
      id: inserted.id as string,
      subject,
      body,
      email: email ?? user?.email ?? null,
      userId: user?.id ?? null,
    }),
  );

  return NextResponse.json({ id: inserted.id, ok: true }, { status: 201 });
}
