import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/personalAccessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME_MAX = 40;
const MAX_TOKENS_PER_USER = 10;

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

function toClientShape(row: TokenRow) {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    createdAt: new Date(row.created_at).getTime(),
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).getTime() : null,
  };
}

// GET: 自分のトークン一覧（平文は二度と返さない）
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("personal_access_tokens")
    .select("id, name, token_prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/account/tokens:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tokens: (data as TokenRow[] ?? []).map(toClientShape),
  });
}

// POST: 新規発行。平文トークンはレスポンスでのみ一度だけ返す。
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { count } = await supabase
    .from("personal_access_tokens")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_TOKENS_PER_USER) {
    return NextResponse.json({ error: "too_many_tokens" }, { status: 429 });
  }

  let body: { name?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // 本文なしは許容（デフォルト名を使う）
  }
  const name = (typeof body.name === "string" ? body.name.trim() : "").slice(0, NAME_MAX) || "MCP";

  const { token, tokenHash, tokenPrefix } = generateToken();

  const { data: inserted, error } = await supabase
    .from("personal_access_tokens")
    .insert({ user_id: user.id, name, token_hash: tokenHash, token_prefix: tokenPrefix })
    .select("id, name, token_prefix, created_at, last_used_at")
    .single();

  if (error || !inserted) {
    console.error("POST /api/account/tokens:", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json(
    { token, ...toClientShape(inserted as TokenRow) },
    { status: 201 },
  );
}

// DELETE /api/account/tokens?id=<uuid>: 失効（行削除）
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("personal_access_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("DELETE /api/account/tokens:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
