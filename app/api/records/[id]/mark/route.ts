import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { isMockRequest } from "@/lib/mockFixtures";

interface PatchBody {
  marked?: unknown;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // #146: 不正 JSON を silent に握って marked:false（unmark）にしない（CLAUDE.md の
  // no-silent-fail 規約）。パース失敗・marked が boolean でない場合は 400 で弾く。
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.marked !== "boolean") {
    return NextResponse.json({ error: "marked_required" }, { status: 400 });
  }
  const marked = body.marked;

  // 管理者限定モックモード。DB write なしで echo する。
  if (await isMockRequest(request, supabase, user.id)) {
    return NextResponse.json({ id, marked });
  }

  const { data, error } = await supabase
    .from("records")
    .update({ marked })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, marked")
    .single();

  if (error || !data) {
    console.error("PATCH /api/records/[id]/mark:", error);
    return NextResponse.json(
      { error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id, marked: data.marked });
}
