import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jstDateString } from "@/lib/period";
import { MAX_DAILY_SESSIONS, ANON_DAILY_STT_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
// ElevenLabs 公開モデルは scribe_v1。v2 は silently invalid → text=""
const MODEL_ID = "scribe_v1";

function pickExtension(file: Blob): string {
  const t = (file.type || "").toLowerCase();
  if (t.includes("mp4") || t.includes("m4a") || t.includes("aac")) return "mp4";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("wav")) return "wav";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  return "webm";
}

const ANON_COOKIE = "yuzu_anon_stt";

function jstMidnightIso(ts: number): string {
  return new Date(`${jstDateString(ts)}T00:00:00+09:00`).toISOString();
}

function jstNextMidnightMs(ts: number): number {
  return new Date(jstMidnightIso(ts)).getTime() + 24 * 60 * 60 * 1000;
}

type AnonStat = { date: string; count: number };

function parseAnonCookie(raw: string | undefined): AnonStat {
  if (!raw) return { date: jstDateString(Date.now()), count: 0 };
  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as AnonStat;
    if (decoded?.date === jstDateString(Date.now())) return decoded;
  } catch {}
  return { date: jstDateString(Date.now()), count: 0 };
}

function buildAnonCookie(stat: AnonStat, https: boolean): string {
  const value = encodeURIComponent(JSON.stringify(stat));
  const secure = https ? "; Secure" : "";
  // HttpOnly: クライアント JS から読めない（改竄を多少抑止する）
  return `${ANON_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing api key" }, { status: 500 });
  }

  // ── #39: 認証 + 1日上限（サーバ強制）──
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const https = req.nextUrl.protocol === "https:";

  if (user) {
    // ログイン済: 既存の records カウントで daily limit を判定（/api/records POST と同基準）
    const since = jstMidnightIso(Date.now());
    const { count } = await supabase
      .from("records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_DAILY_SESSIONS) {
      return NextResponse.json(
        {
          error: "daily_limit",
          todayCount: count ?? 0,
          maxDaily: MAX_DAILY_SESSIONS,
          resetAt: jstNextMidnightMs(Date.now()),
        },
        { status: 429 },
      );
    }
  } else {
    // 未ログイン onboarding: cookie ベースで N回/日まで（改竄可だが bar を上げる）
    // 厳密化は #52（IP rate limit / DB ベース）で対応予定。
    const stat = parseAnonCookie(req.cookies.get(ANON_COOKIE)?.value);
    if (stat.count >= ANON_DAILY_STT_LIMIT) {
      return NextResponse.json(
        {
          error: "login_required",
          message: "先に登録しろ。",
          maxAnon: ANON_DAILY_STT_LIMIT,
          resetAt: jstNextMidnightMs(Date.now()),
        },
        { status: 429 },
      );
    }
  }

  // ── STT 本処理 ──
  const formData = await req.formData();
  const file = formData.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no audio" }, { status: 400 });
  }

  const upstream = new FormData();
  const ext = pickExtension(file);
  upstream.append("file", file, `recording.${ext}`);
  upstream.append("model_id", MODEL_ID);
  upstream.append("language_code", "ja");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: upstream,
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `transcribe failed: ${body}` }, { status: 500 });
  }

  const data = await res.json();
  const rawText = (data.text as string | undefined) ?? "";
  // ElevenLabs Scribe は非音声を括弧つき annotation で返す: [音楽] / (背景ノイズ) / （咳）。
  // ただし正当な発話に含まれる括弧（hesitation 等）まで剥がすと空文字になって
  // 「無音、話せ」hint が出てしまうので、annotation キーワードを含む短い括弧だけ落とす。
  // 角括弧 [] は Scribe では純然たる annotation なので無条件 strip。
  const ANNOTATION_KEYWORDS = /音楽|雑音|背景|ノイズ|咳|笑|拍手|無音|沈黙|溜息|くしゃみ|あくび|ため息|息/;
  const cleanText = rawText
    .replace(/\[[^\]]{0,30}\]/g, "") // [音楽] [拍手] 等は丸ごと
    .replace(/[(（]([^)）]{1,15})[)）]/g, (match, content: string) =>
      ANNOTATION_KEYWORDS.test(content) ? "" : match,
    )
    .replace(/\s+/g, " ")
    .trim();

  // 診断用ログ。strip で空になるケースを後追いするため raw を残す。
  if (cleanText === "" || cleanText.length < 5) {
    console.warn(
      `[transcribe] short/empty after strip: raw="${rawText}" clean="${cleanText}" userId=${user?.id ?? "anon"}`,
    );
  }

  const response = NextResponse.json({ text: cleanText });

  // 未ログイン成功時はカウントをインクリメントして cookie に書き戻す
  if (!user) {
    const stat = parseAnonCookie(req.cookies.get(ANON_COOKIE)?.value);
    const next: AnonStat = { date: stat.date, count: stat.count + 1 };
    response.headers.append("Set-Cookie", buildAnonCookie(next, https));
  }

  return response;
}
