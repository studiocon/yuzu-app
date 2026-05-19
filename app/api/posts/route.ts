import { NextRequest, NextResponse } from "next/server";
import { createPost, listPosts } from "@/lib/kv";
import type { Post } from "@/lib/types";
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

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const postData = {
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
    emoji,
    sessionId: sid,
  };

  let idx: number;
  try {
    idx = await createPost(postData);
  } catch (e) {
    console.error("createPost failed", e);
    return NextResponse.json({ error: "kv_error" }, { status: 500 });
  }

  const post: Post = { ...postData, index: idx };
  const res = NextResponse.json({ post, sessionId: sid });
  if (isNew) setSessionCookie(res, sid);
  return res;
}
