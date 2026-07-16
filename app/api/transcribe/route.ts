import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jstDateString } from "@/lib/period";
import { ANON_DAILY_STT_LIMIT, MAX_AUDIO_BYTES } from "@/lib/constants";
import { getEntitlements } from "@/lib/entitlements";
import { isMockRequest, MOCK_TRANSCRIBE_TEXT } from "@/lib/mockFixtures";

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
// #142: x-forwarded-for はクライアントが送った値が混ざりうる（先頭を偽装して IP バケットを
// 割り、防波堤を回避できる）ため先頭値をそのまま信用しない。Vercel が自エッジで付与する
// x-vercel-forwarded-for / x-real-ip（クライアントからは偽装不可）を優先し、無ければ
// dev 用に x-forwarded-for 先頭へフォールバックする。欠落時は "unknown" バケット。
function getClientIp(req: NextRequest): string {
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// #142: IP クォータは「読むだけ」で判定し、消費（増分）は STT 成功後に寄せる。
// これにより上流（ElevenLabs）の一過性失敗でクォータを消費してロックアウトしない。
// テーブル/RPC 未適用（migration 20260702130000）や読み取り失敗時は 0 を返し、
// cookie ガードのみにフォールバックする（防波堤の追加が落ちても既存ガードは維持）。
async function readAnonIpCount(ip: string, date: string): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("anon_stt_usage")
    .select("request_count")
    .eq("ip", ip)
    .eq("date", date)
    .maybeSingle();
  if (error) {
    console.error(`[transcribe] anon_stt_usage read failed, cookie-only: ${error.message}`);
    return 0;
  }
  return (data?.request_count as number | undefined) ?? 0;
}

// STT 成功時のみ呼ぶ。アトミックに +1（失敗はログのみ、cookie ガードは別途効く）。
async function incrementAnonIp(ip: string, date: string): Promise<void> {
  const { error } = await createAdminClient().rpc("increment_anon_stt_usage", {
    p_ip: ip,
    p_date: date,
  });
  if (error) {
    console.error(`[transcribe] anon_stt_usage increment failed: ${error.message}`);
  }
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
    // 管理者限定モックモード。ElevenLabs に触れず固定テキストを返す。
    if (await isMockRequest(req, supabase, user.id)) {
      return NextResponse.json({ text: MOCK_TRANSCRIBE_TEXT });
    }

    // ログイン済: 既存の records カウントで daily limit を判定（/api/records POST と同基準）
    // maxDailySessions が null（admin）なら上限チェックをスキップ
    const ent = await getEntitlements(supabase, user.id, req);
    if (ent.maxDailySessions !== null) {
      const since = jstMidnightIso(Date.now());
      const { count } = await supabase
        .from("records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if ((count ?? 0) >= ent.maxDailySessions) {
        return NextResponse.json(
          {
            error: "daily_limit",
            todayCount: count ?? 0,
            maxDaily: ent.maxDailySessions,
            resetAt: jstNextMidnightMs(Date.now()),
          },
          { status: 429 },
        );
      }
    }
  } else {
    // 未ログイン onboarding: cookie（改竄可）+ IP ベースの DB カウント（#52）の二重チェック。
    // #142: ここでは現在値を「読むだけ」で判定し、クォータ消費（増分）は STT 成功後に寄せる。
    // これで上流の一過性失敗ではクォータが減らず、リトライがロックアウトされない。
    // テーブル/RPC 未適用や読み取り失敗時は cookie 判定のみにフォールバック。
    const stat = parseAnonCookie(req.cookies.get(ANON_COOKIE)?.value);
    const ipCount = await readAnonIpCount(getClientIp(req), jstDateString(Date.now()));

    if (stat.count >= ANON_DAILY_STT_LIMIT || ipCount >= ANON_DAILY_STT_LIMIT) {
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
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
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
    console.error(`[transcribe] upstream error status=${res.status}: ${body}`);
    return NextResponse.json({ error: "transcribe_failed" }, { status: 500 });
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

  // 未ログイン成功時のみクォータを消費する（#142: 上流失敗では消費しない）。
  // IP カウンタ（アトミック +1）と cookie の両方を成功後にまとめて進める。
  if (!user) {
    await incrementAnonIp(getClientIp(req), jstDateString(Date.now()));
    const stat = parseAnonCookie(req.cookies.get(ANON_COOKIE)?.value);
    const next: AnonStat = { date: stat.date, count: stat.count + 1 };
    response.headers.append("Set-Cookie", buildAnonCookie(next, https));
  }

  return response;
}
