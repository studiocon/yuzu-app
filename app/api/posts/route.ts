import { NextRequest, NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/kv";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const KV_MISSING = !process.env.KV_REDIS_URL && !process.env.REDIS_URL;

export async function GET() {
  if (KV_MISSING) {
    return NextResponse.json(
      { error: "kv_not_configured", posts: [] },
      { status: 503 },
    );
  }
  const { id: sid, isNew } = getOrCreateSessionId();
  try {
    const posts = await listPosts(sid);
    const res = NextResponse.json({ posts, sessionId: sid });
    if (isNew) setSessionCookie(res, sid);
    return res;
  } catch (e) {
    console.error("listPosts failed", e);
    const res = NextResponse.json(
      { error: "kv_error", posts: [] },
      { status: 500 },
    );
    if (isNew) setSessionCookie(res, sid);
    return res;
  }
}

export async function POST(req: NextRequest) {
  if (KV_MISSING) {
    return NextResponse.json(
      { error: "kv_not_configured" },
      { status: 503 },
    );
  }
  const { id: sid, isNew } = getOrCreateSessionId();
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const emoji = typeof body?.emoji === "string" ? body.emoji : "🍑";
  const blob = Array.isArray(body?.blob) && body.blob.length === 3 ? body.blob : null;

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (!blob) return NextResponse.json({ error: "blob required" }, { status: 400 });

  const post = {
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
    emoji,
    blob: blob as [string, string, string],
    sessionId: sid,
  };

  try {
    await createPost(post);
  } catch (e) {
    console.error("createPost failed", e);
    return NextResponse.json({ error: "kv_error" }, { status: 500 });
  }

  const res = NextResponse.json({
    post: { ...post, reactions: emptyCounts(), reacted: [] },
    sessionId: sid,
  });
  if (isNew) setSessionCookie(res, sid);
  return res;
}

function emptyCounts() {
  return { "🍑": 0, "🍋": 0, "🌱": 0, "🫐": 0, "🍒": 0 };
}
