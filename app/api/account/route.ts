import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// アカウント削除（App Store Guideline 5.1.1(v) 必須）。
// 本人のみ。auth ユーザーを service_role で削除すると
// records / reports / theme_cache / profiles は on delete cascade で全消去される。
// 「RECORD は編集削除不可」とは別概念：アカウント自体の削除は唯一の退出口。
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // silent にしない（CLAUDE.md 方針）。原因をクライアントへ返す。
    console.error("DELETE /api/account:", error);
    return NextResponse.json(
      { error: error.message, code: "delete_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
