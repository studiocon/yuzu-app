import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";

// MCP 連携用パーソナルアクセストークン。平文は DB に保存しない（sha256 ハッシュのみ）。
const TOKEN_PREFIX = "yuzu_pat_";
const PREFIX_DISPLAY_LEN = 8; // 一覧表示用に見せる先頭文字数

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const raw = crypto.randomBytes(24).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  return {
    token,
    tokenHash: hashToken(token),
    tokenPrefix: token.slice(0, TOKEN_PREFIX.length + PREFIX_DISPLAY_LEN),
  };
}

// Bearer トークンを検証して user_id を返す。service_role（RLS バイパス）でのみ検索可能。
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("personal_access_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data) return null;

  const { error: updateError } = await admin
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id as string);
  if (updateError) {
    console.error("verifyToken: last_used_at update failed", updateError);
  }

  return { userId: data.user_id as string };
}
