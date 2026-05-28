import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractWordFrequencies } from "@/lib/wordAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("records")
    .select("text")
    .eq("user_id", user.id);

  if (error) {
    console.error("GET /api/insights/words:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const texts = (data ?? []).map((r) => (r as { text: string }).text);
  const words = extractWordFrequencies(texts);

  return NextResponse.json(
    { words },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
