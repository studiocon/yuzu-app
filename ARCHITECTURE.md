# ARCHITECTURE — YUZU

技術スタック・ディレクトリ構成・ローカル開発・Supabase セットアップ・検証フロー。
思想とコンセプトは [README.md](README.md)、製品仕様は [PRD.md](PRD.md)、デザインシステムは [DESIGN.md](DESIGN.md)、Claude Code 作業規約は [CLAUDE.md](CLAUDE.md) を参照。

## 技術スタック

| レイヤー | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + React 18 + TypeScript |
| ネイティブ | Expo / React Native（iOS / Android、V2 以降） |
| 録音 | MediaRecorder API |
| STT | [ElevenLabs Scribe](https://elevenlabs.io/)（`scribe_v2` / `no_verbatim`） |
| レポート・感情分析 | Anthropic Claude（`@anthropic-ai/sdk`、サーバ専用） |
| DB / Auth | Supabase（Postgres + Auth、RLS） |
| ホスティング | Vercel |

## ディレクトリ構成

```
app/                  Next.js App Router + API routes（transcribe / records / reports / insights）
components/           "use client" コンポーネント
lib/                  型・JST 境界・センチメント集約・レポート生成・カスタムフック
public/               design-preview.html ほか静的アセット
scripts/              design:drift / design:sync スクリプト
supabase/migrations/  スキーマ・RLS・RPC（番号順に適用）
.claude/              Claude Code の共有設定・サブエージェント
docs/                 デプロイ / 運用手順
```

ファイル単位の詳細地図は [CLAUDE.md](CLAUDE.md) の「ディレクトリマップ」を参照。

## ローカル開発

```bash
npm install
cp .env.local.example .env.local  # 各キーを設定
npm run dev
```

`.env.local` に必要な環境変数（テンプレートは [.env.local.example](.env.local.example)）:

```
ELEVENLABS_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # サーバー専用。NEXT_PUBLIC を付けない
```

ブラウザで `http://localhost:3000` を開く。マイク権限の許可が必要。デザインプレビューは `http://localhost:3000/design-preview.html`。

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
0006_records_duration.sql         — records.duration_ms カラム + INSERT GRANT + get_total_duration_ms() RPC（総録音分数）
0007_fix_get_streak.sql           — get_streak() の修正
0008_theme_cache.sql              — theme_cache テーブル（PATTERN テーマの永続キャッシュ）+ RLS SELECT + GRANT
0009_plan.sql                     — profiles に plan 列（Free/Light/Premium）+ check + authenticated UPDATE 剥奪（自己昇格防止）
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

**Apple Sign In:** Client ID（App の Bundle ID）/ Team ID / Key ID / Private Key（`.p8` の内容）
**Google:** Client ID（Google Cloud Console）/ Client Secret
**Email（Magic Link）:** 「Enable Email provider」オン・「Confirm email」オン・「Email OTP」有効。パスワードサインインは **使わない**（UI に出さない）。

### 4. Redirect URL の登録

`Authentication > URL Configuration` に追加:

```
http://localhost:3000/auth/callback        # ローカル開発
https://yourdomain.com/auth/callback       # 本番
```

## 検証コマンド

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # next lint（server-only 誤 import を捕捉）
npm run design:check   # デザイン整合性チェック（drift + Google design.md linter）
npm run verify         # 上記 3 つを一括（commit/push 前推奨）
npm run dev            # ローカル起動
```

- CI（[.github/workflows/ci.yml](.github/workflows/ci.yml)）でも `typecheck` / `lint` / `build` を自動実行。
- `npm install` で husky が pre-commit hook を自動セットアップ（DESIGN.md ステージ時に `design:sync` で preview を同期）。
- デザイントークン（CSS 変数）は [DESIGN.md](DESIGN.md) 冒頭の YAML frontmatter に集約され、[app/globals.css](app/globals.css) の `:root` と CI で突合される。色・シェイプ・easing を変更したら **DESIGN.md / app/globals.css / public/design-preview.html の三者**を更新し `design:check` をパスさせる。

## デプロイ / 運用

本番適用手順・smoke test・ロールバックは [docs/deploy.md](docs/deploy.md) に集約。
