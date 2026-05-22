# YUZU

> 生の声が、香る。

プロダクト要件・機能仕様・品質基準は [PRD.md](PRD.md) を参照。
Claude Code でこのリポジトリに作業させる場合の規約は [CLAUDE.md](CLAUDE.md) を参照。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 |
| ネイティブ | Expo / React Native（iOS / Android、V2 以降） |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe v2](https://elevenlabs.io/) |
| レポート生成 | Anthropic Claude（`@anthropic-ai/sdk`） |
| ストレージ | Upstash Redis（`redis`） |
| ホスティング | Vercel |
| 認証 | Supabase Auth（Google / Apple、V2 以降） |

## デザイン

世界観・カラー・シェイプ・コンポーネント仕様は [DESIGN.md](DESIGN.md) を、実体プレビューは [public/design-preview.html](public/design-preview.html) を参照（後者が **source-of-truth**）。

デザイントークン（CSS 変数）は [DESIGN.md](DESIGN.md) 冒頭の YAML frontmatter に集約され、[app/globals.css](app/globals.css) の `:root` と CI で突合される（Google Labs [design.md](https://github.com/google-labs-code/design.md) 仕様に準拠）。

```bash
npm run design:check   # ドリフト検出 + Google linter
npm run design:drift   # CSS↔DESIGN.md 突合のみ（軽量）
npm run design:sync    # DESIGN.md → design-preview.html へ反映
```

色・シェイプ・easing を変更したら **DESIGN.md / app/globals.css / design-preview.html の三者**を更新し、`design:check` がパスすることを確認してから commit する。`pre-commit` フックが DESIGN.md ステージ時に `design:sync` を自動実行する。

## ローカル開発

```bash
npm install
cp .env.local.example .env.local  # 各キーを設定
npm run dev
```

`.env.local` に必要な環境変数:

```
ELEVENLABS_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
KV_URL=redis://...
```

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要。デザインプレビューは `http://localhost:3000/design-preview.html`。

## ディレクトリ構成

```
app/                  Next.js App Router + API routes
components/           "use client" コンポーネント
lib/                  型・JST 境界・センチメント集約・KV・レポート生成
public/               design-preview.html ほか静的アセット
scripts/              design:drift / design:sync スクリプト
.claude/              Claude Code の共有設定・サブエージェント
```

詳細なファイル単位の地図は [CLAUDE.md](CLAUDE.md) の「ディレクトリマップ」を参照。

## 検証コマンド

```bash
npx tsc --noEmit       # 型チェック
npm run design:check   # デザイン整合性チェック
npm run dev            # ローカル起動
```

## Claude Code との連携

- [CLAUDE.md](CLAUDE.md) — プロジェクト規約。Claude Code が起動時に自動で読み込む
- [.claude/settings.json](.claude/settings.json) — 共有許可リスト（頻出コマンドの permission prompt を抑制）
- [.claude/agents/design-sync.md](.claude/agents/design-sync.md) — preview / DESIGN.md / app 整合性監査エージェント
- [.claude/agents/copy-reviewer.md](.claude/agents/copy-reviewer.md) — VOICE & TONE 準拠監査エージェント

`.claude/settings.local.json` はローカル個別の許可リストで gitignore 済み。

## ライセンス

Private project.
