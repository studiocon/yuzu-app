import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jstDateString } from "@/lib/period";
import { MAX_DAILY_SESSIONS, ANON_DAILY_STT_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
// scribe_v2 が現行の公開モデル。no_verbatim（フィラー除去）は v2 専用パラメータ。
const MODEL_ID = "scribe_v2";

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

// cookie は削除・改竄できるので、IP ベースの DB カウントを防波堤として重ねる（#52）。
// x-forwarded-for は Vercel が付与する。ローカル dev 等で欠けている場合は "unknown" に
// バケットされる（同時アクセスが無ければ実害無し）。
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing api key" }, { status: 500 });
  }

  // ── #39: 認証 + 1日上限（サーバ強制）── #100: native は Bearer、Web は cookie
  const { supabase, user } = await getAuthedClient(req);
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
    // 未ログイン onboarding: cookie（改竄可）+ IP ベースの DB カウント（#52）の二重チェック。
    // IP 側はアトミックに増分してから判定するので、cookie 削除・直叩きでは突破できない。
    // migration 20260702130000 未適用（RPC 不在）の場合は cookie 判定のみにフォールバックする
    // （防波堤の追加が失敗しても、既存の cookie ガードごと落とさない）。
    const stat = parseAnonCookie(req.cookies.get(ANON_COOKIE)?.value);
    let overIpLimit = false;
    const { data: ipCount, error: ipErr } = await createAdminClient().rpc(
      "increment_anon_stt_usage",
      { p_ip: getClientIp(req), p_date: jstDateString(Date.now()) },
    );
    if (ipErr) {
      console.error(`[transcribe] anon_stt_usage rpc failed, falling back to cookie-only: ${ipErr.message}`);
    } else {
      overIpLimit = (ipCount ?? 0) > ANON_DAILY_STT_LIMIT;
    }

    if (stat.count >= ANON_DAILY_STT_LIMIT || overIpLimit) {
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
  upstream.append("no_verbatim", "true"); // フィラー（えーと/あの 等）除去。v2 専用
  upstream.append("tag_audio_events", "false"); // [音楽]/(咳) 等の annotation を出力させない

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
  // tag_audio_events=false で annotation（[音楽]/(咳) 等）は出ない前提。空白正規化のみ。
  const cleanText = rawText.replace(/\s+/g, " ").trim();

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
