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
app/                  Next.js App Router + API routes（transcribe / records / reports / insights / account / mcp）
components/           "use client" コンポーネント
lib/                  型・JST 境界・センチメント集約・レポート生成・カスタムフック
public/               design-preview.html ほか静的アセット
scripts/              design:drift / design:sync スクリプト
supabase/migrations/  スキーマ・RLS・RPC（番号順に適用）
mcp-server/           Claude Desktop 用スタンドアロン MCP サーバー（個人用アクセストークンで `/api/mcp/*` を読む。Next.js アプリとは別の npm パッケージ）
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

**本番適用は引き続き手動**（SQL Editor で番号=タイムスタンプ順に実行）。Supabase CLI（`supabase/config.toml`）はローカル検証・ドリフト検知専用で導入した。`supabase migration list --linked` で「ローカルにあって本番の追跡テーブルに無いファイル」を確認できる（読み取りのみ、書き込みは発生しない）。CI の [migration-drift.yml](.github/workflows/migration-drift.yml) は `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROJECT_ID` が secrets/variables に設定されていれば同じチェックを PR で自動実行する（未設定の間はジョブごとスキップ）。

> ⚠️ 導入時点（2026-07-02）で判明した既知の制約: 本番の `supabase_migrations.schema_migrations` には、過去に `mcp__supabase__apply_migration` 経由で適用された分が**ローカルとは別の version 番号**で記録されている（中身は一致確認済み）。`supabase migration repair` で番号を同期する本番書き込み作業を行うまで、`migration list` / CI の drift check は既に適用済みの古いファイルを「未適用」と誤検知する。詳細は CLAUDE.md の該当セクション参照。

ファイル名は Supabase CLI 互換のタイムスタンプ形式（`YYYYMMDDHHMMSS_name.sql`）にリネーム済み（旧 `0001_init.sql` 等の連番形式から移行、2026-07-02）:

```
20260523170020_init.sql                     — profiles / records テーブル + RLS + トリガー
20260523170021_reports.sql                  — reports テーブル + RLS
20260523170022_streak.sql                   — get_streak() RPC（JST 連続日数）
20260524173200_mark.sql                     — records.marked カラム + UPDATE RLS
20260524173201_records_column_grants.sql    — INSERT/UPDATE のカラム単位 GRANT（編集禁止思想を担保）
20260529065052_records_duration.sql         — records.duration_ms カラム + INSERT GRANT + get_total_duration_ms() RPC（総録音分数）
20260529095947_fix_get_streak.sql           — get_streak() の修正
20260530133909_theme_cache.sql              — theme_cache テーブル（PATTERN テーマの永続キャッシュ）+ RLS SELECT + GRANT
20260530205304_plan.sql                     — profiles に plan 列（Free/Light/Premium）+ check + authenticated UPDATE 剥奪（自己昇格防止）
20260531083245_inquiries.sql                — inquiries テーブル（問い合わせフォーム保存）
20260531111320_theme_cache_error.sql        — themes API の Anthropic 失敗を short-TTL negative cache
20260602213515_grant_profiles_to_service_role.sql — service_role へ profiles SELECT を明示 GRANT
20260602214007_grant_service_role_dml.sql   — service_role の GRANT 欠落を一括修正（records/reports/theme_cache/profiles）
20260626003830_personal_access_tokens.sql   — 個人用アクセストークン（MCP 連携用。sha256 ハッシュのみ保存）
20260629070634_revoke_public_function_execute.sql — PUBLIC への自動 EXECUTE 付与を剥がす（security advisor 対応）
20260702075418_report_jobs.sql              — レポート生成非同期化の進行状況テーブル
20260702130000_anon_stt_rate_limit.sql      — 匿名 STT の IP ベース DB レート制限（#52 の厳密化）
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
https://yuzu.style/auth/callback           # 本番
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
