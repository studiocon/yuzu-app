// Slack Incoming Webhook の薄いラッパー。
// 通知失敗で呼び出し元の処理を壊さないため、内部で例外を握り潰してログだけ残す。
// 環境変数 SLACK_WEBHOOK_URL が未設定なら no-op。

export async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    // 通知失敗は本処理を壊さない。silent でなく明示的にログ。
    console.error("Slack webhook failed:", e);
  }
}
