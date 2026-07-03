import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";

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

  let body: PatchBody = {};
  try { body = await request.json(); } catch {}
  const marked = body.marked === true;

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
