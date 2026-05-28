// PATTERN セクションで使うテーマの型 + Claude プロンプト + mock データ。
// Anthropic SDK の import は API route 側で行う（クライアントから import 禁止）。

export type Theme = {
  theme: string;        // 短い・鋭い・10文字以内
  description: string;  // 1文・断定的・YUZU トーン
  count: number;        // 関連投稿の推定件数
};

export const MIN_POSTS_FOR_THEMES = 10;
export const MAX_POSTS_FOR_ANALYSIS = 50;

export const THEMES_SYSTEM_PROMPT = `あなたはユーザーの音声ジャーナリング投稿を分析するインサイトエンジンです。
以下のルールに厳密に従ってください。

【ルール】
- ユーザーの全投稿を読み、無意識に繰り返し登場するテーマを最大5つ抽出する
- テーマは「単語」ではなく「意味の塊」として抽出する（例: 単語"仕事"ではなく、テーマ"評価されることへの不安"）
- テーマ名は短く・鋭く・日本語で（10文字以内）
- 説明文は1文・断定的・YUZU のトーンに合わせる（"Raw. Real. You."）
- 「寄り添う」「癒し」「やさしく」「ふんわり」などのやわらかい表現は使わない
- ユーザーが気づいていないことを突きつけるトーンで書く
- count はそのテーマに関連する投稿の推定件数

【出力フォーマット】
JSON 配列のみを返す。前置き・説明・Markdown コードブロック不要。
[
  { "theme": "テーマ名", "description": "1文の説明", "count": 数値 }
]`;

export function buildThemesUserPrompt(posts: { text: string }[]): string {
  return `以下はユーザーの音声ジャーナリング投稿です（新着順）。

${posts.map((p, i) => `[${i + 1}] ${p.text}`).join("\n")}

繰り返し出てくるテーマを抽出してください。`;
}

// JSON 配列だけ取り出す（前置きや ```json ... ``` を弾く）
export function extractThemesJson(raw: string): Theme[] | null {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (t): t is Theme =>
          t &&
          typeof t.theme === "string" &&
          typeof t.description === "string" &&
          typeof t.count === "number",
      )
      .slice(0, 5);
  } catch {
    return null;
  }
}

// mock mode 用の hardcoded テーマ。mockPosts.ts の内容に対応させた "それっぽい" 例。
// 実 Claude を呼ばないので断定的トーンを手書きで再現する。
export const MOCK_THEMES: Theme[] = [
  {
    theme: "他人の評価",
    description: "怒られたこと、ミスのことを何度も書き残している。気にしすぎだ。",
    count: 6,
  },
  {
    theme: "本物への執着",
    description: "「本物でいろ」と自分に何度も言い聞かせている。",
    count: 4,
  },
  {
    theme: "夜の反芻",
    description: "眠れない夜に過去の失敗を再生してしまう癖がある。",
    count: 3,
  },
  {
    theme: "小さな救い",
    description: "コーヒー、青空、笑い、走った瞬間—断片に救われている。",
    count: 5,
  },
];
