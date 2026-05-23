import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

interface CreateBody {
  text?: unknown;
}

interface RecordRow {
  id: string;
  user_id: string;
  text: string;
  char_count: number;
  created_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, count, error } = await supabase
    .from("records")
    .select("id, user_id, text, char_count, created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/records:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? (data?.length ?? 0);
  const posts: Post[] = (data as RecordRow[] ?? []).map((row, i) => ({
    id: row.id,
    user_id: row.user_id,
    text: row.text,
    char_count: row.char_count,
    createdAt: new Date(row.created_at).getTime(),
    index: total - i,  // newest post has highest index
  }));

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("records")
    .insert({ user_id: user.id, text, char_count: text.length })
    .select("id, user_id, text, char_count, created_at")
    .single();

  if (insertError || !inserted) {
    console.error("POST /api/records:", insertError);
    return NextResponse.json(
      { error: insertError?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  // index = total post count after insert
  const { count } = await supabase
    .from("records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const post: Post = {
    id: (inserted as RecordRow).id,
    user_id: (inserted as RecordRow).user_id,
    text: (inserted as RecordRow).text,
    char_count: (inserted as RecordRow).char_count,
    createdAt: new Date((inserted as RecordRow).created_at).getTime(),
    index: count ?? 1,
  };

  return NextResponse.json({ post }, { status: 201 });
}
