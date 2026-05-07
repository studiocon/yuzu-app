# PEACH

> 声は、種。つぶやきは、実る。

PEACH は、声でつぶやくと思考が育っていくサービスです。キーボードも整理も不要。長押しして話すだけで投稿される。あなたのつぶやきは、いつか他の誰かのつぶやきと勝手に繋がり、予想もしなかったアイデアになって戻ってくる。人をフォローするんじゃない。**考えが出会う場所**です。

## コンセプト

- **声は種** — 長押しして話すだけで投稿
- **育つ** — マイページで思考が時系列に蓄積
- **繋がる** — 関連ポストがAIで自動リンク（V3）
- **実る** — AIが要約・音声で読み上げ（V2以降）

メモ帳は自分のため。SNSは他人のため。**PEACH は思考のため**。

| 比較対象 | PEACH との違い |
|---|---|
| メモ帳 / Notion | 書く前提・整理前提。PEACH は声でこぼすだけ |
| Claude / ChatGPT | 会話が消える。PEACH は蓄積・繋がる |
| Twitter / X | バズ圧力・人フォロー。PEACH は考えが繋がる |
| 日記アプリ | 続かない。PEACH は長押し1アクション |

## 制約（コンセプトの核）

意図的に削ぎ落としています。

- 音声入力のみ（テキスト入力欄なし）
- 編集不可
- 削除不可
- フォロー / いいね / リポストなし

「整理する前」の生っぽい思考に価値があるという思想に基づいています。

## 機能（MVP）

- マイクボタンを **2秒以上長押し**で録音開始
- 指を離すと自動で文字起こし → 即投稿
- 全投稿を新着順にタイムライン表示
- ゲストでも投稿・閲覧可能

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| ホスティング | Vercel |
| 保存 | localStorage（MVP）→ Vercel KV / Supabase（V2以降） |

## デザイン

世界観・カラー・シェイプ・コンポーネント仕様は [DESIGN.md](DESIGN.md) を参照。

## ローカル開発

```bash
npm install
cp .env.local.example .env.local  # ELEVENLABS_API_KEY を設定
npm run dev
```

`.env.local` に必要な環境変数:

```
ELEVENLABS_API_KEY=your_key_here
```

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要です。

## ロードマップ

| フェーズ | 内容 | 状態 |
|---|---|---|
| MVP v0 | 録音 → 投稿 → localStorage | ✅ |
| MVP v1 | ElevenLabs Scribe v2 統合 | ✅ |
| V2 | Supabase 移行 + アカウント + 果物絵文字アバター + TTS読み上げ | 計画中 |
| V3 | AI による関連ポスト自動リンク + 思考の要約 | 構想中 |

## ライセンス

Private project.
