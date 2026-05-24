import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PatchBody {
  marked?: unknown;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    return NextResponse.json(
      { error: error?.message ?? "update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id, marked: data.marked });
}
