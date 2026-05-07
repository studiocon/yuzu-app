import { NextRequest, NextResponse } from "next/server";
import { postExists, toggleReaction } from "@/lib/kv";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";
import { isStamp } from "@/lib/stamps";

export const runtime = "nodejs";

const KV_MISSING = !process.env.KV_REDIS_URL && !process.env.REDIS_URL;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (KV_MISSING) {
    return NextResponse.json({ error: "kv_not_configured" }, { status: 503 });
  }
  const { id: sid, isNew } = getOrCreateSessionId();
  const body = await req.json().catch(() => null);
  const stamp = body?.stamp;

  if (!isStamp(stamp)) {
    return NextResponse.json({ error: "invalid stamp" }, { status: 400 });
  }
  try {
    if (!(await postExists(params.id))) {
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }
    const result = await toggleReaction(params.id, sid, stamp);
    const res = NextResponse.json(result);
    if (isNew) setSessionCookie(res, sid);
    return res;
  } catch (e) {
    console.error("toggleReaction failed", e);
    return NextResponse.json({ error: "kv_error" }, { status: 500 });
  }
}
