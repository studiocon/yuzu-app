import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const API = "https://api.assemblyai.com/v2";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing api key" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no audio" }, { status: 400 });
  }

  const audioBuffer = Buffer.from(await file.arrayBuffer());

  const uploadRes = await fetch(`${API}/upload`, {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/octet-stream" },
    body: audioBuffer,
  });
  if (!uploadRes.ok) {
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
  const { upload_url } = await uploadRes.json();

  const createRes = await fetch(`${API}/transcript`, {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ audio_url: upload_url, language_code: "ja" }),
  });
  if (!createRes.ok) {
    return NextResponse.json({ error: "create transcript failed" }, { status: 500 });
  }
  const { id } = await createRes.json();

  const start = Date.now();
  while (Date.now() - start < 55_000) {
    const pollRes = await fetch(`${API}/transcript/${id}`, {
      headers: { authorization: apiKey },
    });
    const data = await pollRes.json();
    if (data.status === "completed") {
      return NextResponse.json({ text: data.text ?? "" });
    }
    if (data.status === "error") {
      return NextResponse.json({ error: data.error ?? "transcript error" }, { status: 500 });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  return NextResponse.json({ error: "timeout" }, { status: 504 });
}
