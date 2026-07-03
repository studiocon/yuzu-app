import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { extractWordFrequencies } from "@/lib/wordAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedClient(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("records")
    .select("text")
    .eq("user_id", user.id);

  if (error) {
    console.error("GET /api/insights/words:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const texts = (data ?? []).map((r) => (r as { text: string }).text);
  const words = extractWordFrequencies(texts);

  return NextResponse.json(
    { words },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
