# YUZU — BE TRUE / 本物でいろ

整えるな。話せ。あなたの声はそのまま記録になる。

**Raw. Real. You.**

---

## YUZU とは何か

YUZU は声を絞り出す音声ジャーナリングアプリ。マイクを長押しして話すだけで記録になる。整える前のナマの思考を、整えないまま残す。書くのではなく、話す。編集するのではなく、刻む。

## YUZU はどんな人向けか

ジャーナリングに興味はあるが続かなかった人。SNS に疲れて、本音を出せる場所がない人。整った言葉ではなく、まだ言葉になっていないものを出したい人。

## 他の音声ジャーナリングアプリとの違い

- **編集できない。** 一度話した声は書き換えられない
- **削除できない。** 黒歴史も記録の一部として残る
- **テキスト入力もない。** 文字で整えることを許さない
- **AI が問い返さない。** 一方向の吐き出しに徹する
- **整える前の思考が記録になる。** うまく話そうとした瞬間、それはもう YUZU ではない

## なぜ「整えない」のか

整えた言葉は、自分の言葉ではなく、社会に通じる言葉になる。本当に知りたい自分の輪郭は、整える前の、口ごもり・言い直し・沈黙の中にある。YUZU はその粗さを記録として残すための装置であって、思考を綺麗にするツールではない。

ミッション：**まだ知らない自分に、出会わせる。**

## 名前の由来

柚子は絞るか、削るか、熱を加えなければ香りが出ない。声も同じ。外に出さなければ、自分は自分のまま留まる。

---

プロダクト要件・機能仕様・品質基準は [PRD.md](PRD.md) を参照。
Claude Code でこのリポジトリに作業させる場合の規約は [CLAUDE.md](CLAUDE.md) を参照。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 |
| ネイティブ | Expo / React Native（iOS / Android、V2 以降） |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe](https://elevenlabs.io/)（`scribe_v1`） |
| レポート生成 | Anthropic Claude（`@anthropic-ai/sdk`） |
| DB / Auth | Supabase（Postgres + Auth） |
| ホスティング | Vercel |

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
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...   # サーバー専用。NEXT_PUBLIC を付けない
```

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要。デザインプレビューは `http://localhost:3000/design-preview.html`。

## Supabase セットアップ（初回・手動作業）

以下は **Supabase ダッシュボードでオーナーが行う手動設定**。コードでは設定しない。

### 1. プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. `Settings > API` から `Project URL` と `anon key`、`service_role key` を取得して `.env.local` と Vercel 環境変数に設定

### 2. データベース マイグレーション

> 本番への適用手順 / smoke test / ロールバック SQL は **[docs/deploy.md](docs/deploy.md)** に集約。
> 0005 適用後の RLS / GRANT 検証は `supabase/verify/0005_grants_check.sql` を Impersonate モードで実行。

SQL Editor から `supabase/migrations/` 内の SQL ファイルを **番号順** に実行する:

```
0001_init.sql                     — profiles / records テーブル + RLS + トリガー
0002_reports.sql                  — reports テーブル + RLS
0003_streak.sql                   — get_streak() RPC（JST 連続日数）
0004_mark.sql                     — records.marked カラム + UPDATE RLS
0005_records_column_grants.sql    — INSERT/UPDATE のカラム単位 GRANT（編集禁止思想を担保）
```

#### マイグレーション適用後の検証

`0005` 適用後、編集禁止が効いていることを SQL Editor で確認:

```sql
-- ① 本文を改竄しようとして失敗するはず（権限エラー）
update public.records set text = 'hacked' where id = '<any-id>';

-- ② marked のトグルは通る
update public.records set marked = true where id = '<any-id>';

-- ③ marked = true で INSERT しても DB 上は false になる（GRANT (user_id, text, char_count) のみ許可）
insert into public.records (user_id, text, char_count, marked)
  values (auth.uid(), 'test', 4, true)
  returning marked;  -- → false
```

### 3. 認証プロバイダの有効化

`Authentication > Providers` で以下を有効化する:

**Apple Sign In:**
- Client ID（App の Bundle ID）
- Team ID
- Key ID
- Private Key（`.p8` ファイルの内容）

**Google:**
- Client ID（Google Cloud Console で取得）
- Client Secret

**Email（Magic Link）:**
- 「Enable Email provider」をオン
- 「Confirm email」をオン
- 「Email OTP」はデフォルトで有効
- パスワードサインインは **使わない**（UI に出さない）

### 4. Redirect URL の登録

`Authentication > URL Configuration` に以下を追加:

```
http://localhost:3000/auth/callback        # ローカル開発
https://yourdomain.com/auth/callback       # 本番
```

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
npm run typecheck      # tsc --noEmit
npm run lint           # next lint（server-only 誤 import を捕捉）
npm run design:check   # デザイン整合性チェック（drift + linter）
npm run verify         # 上記 3 つを一括（commit/push 前推奨）
npm run dev            # ローカル起動
```

CI（[.github/workflows/ci.yml](.github/workflows/ci.yml)）でも `typecheck` / `lint` / `build` を自動実行する。
`npm install` で husky が pre-commit hook を自動セットアップ（DESIGN.md ステージ時に preview 同期）。

## Mock モード

Supabase 接続なしで UI を動作させたい時:

```
http://localhost:3000/?mock=1
```

- `sessionStorage` + `yuzu-mock-mode` cookie に印が立ち、middleware の保護ルート（`/reports` / `/settings`）チェックをバイパス
- 投稿は localStorage 擬似で本番 DB に書かない
- レポート・センチメントは固定ダミーを返す
- mock を抜けるには `sessionStorage.clear()` + cookie 削除 + リロード

新規開発者は **これを最初に試す** と Supabase 未設定でも UI 全体を回せる。

## Claude Code との連携

- [CLAUDE.md](CLAUDE.md) — プロジェクト規約。Claude Code が起動時に自動で読み込む
- [.claude/settings.json](.claude/settings.json) — 共有許可リスト（頻出コマンドの permission prompt を抑制）
- [.claude/agents/design-sync.md](.claude/agents/design-sync.md) — preview / DESIGN.md / app 整合性監査エージェント
- [.claude/agents/copy-reviewer.md](.claude/agents/copy-reviewer.md) — VOICE & TONE 準拠監査エージェント

`.claude/settings.local.json` はローカル個別の許可リストで gitignore 済み。

## ライセンス

Private project.
