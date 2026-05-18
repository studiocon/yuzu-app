# YUZU

> 生の声が、香る。

プロダクト要件・機能仕様・品質基準は [PRD.md](PRD.md) を参照。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 |
| ネイティブ | Expo / React Native（iOS / Android） |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| ホスティング | Vercel |
| DB | Supabase PostgreSQL |
| 認証 | Supabase Auth（Google / Apple） |
| メール配信 | Resend |
| プッシュ通知 | Expo Notifications |

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
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
RESEND_API_KEY=your_key_here
```

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要です。

## ライセンス

Private project.
