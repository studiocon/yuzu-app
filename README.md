# PEACH

> 声は、種。つぶやきは、実る。

プロダクト要件・機能仕様・品質基準は [PRD.md](PRD.md) を参照。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| ホスティング | Vercel |
| 保存 | Vercel KV（投稿・リアクション）→ Supabase（V2以降） |

## デザイン

世界観・カラー・シェイプ・コンポーネント仕様は [DESIGN.md](DESIGN.md) を参照。

デザイントークン（CSS 変数）は [DESIGN.md](DESIGN.md) 冒頭の YAML frontmatter に集約され、[app/globals.css](app/globals.css) の `:root` と CI で突合される（Google Labs [design.md](https://github.com/google-labs-code/design.md) 仕様に準拠）。

```bash
npm run design:check   # ドリフト検出 + Google linter
npm run design:drift   # CSS↔DESIGN.md 突合のみ（軽量）
```

色・シェイプ・easing を変更したら **両ファイル**を更新し、`design:check` がパスすることを確認してから commit する。

## ローカル開発

```bash
npm install
cp .env.local.example .env.local  # ELEVENLABS_API_KEY を設定
npm run dev
```

`.env.local` に必要な環境変数:

```
ELEVENLABS_API_KEY=your_key_here
KV_REDIS_URL=redis://...
```

`KV_REDIS_URL` は Vercel Marketplace の **Redis (Official Redis for Vercel)** を Project に Connect すると自動で生成される。`vercel env pull .env.local` でローカルにも同期可能。

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要です。

## ライセンス

Private project.
