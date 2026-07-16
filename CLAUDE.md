# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときの規約。あなた（Claude）に向けて書いている。

## プロジェクトの輪郭

YUZU は「声を加工せずに記録する」音声ジャーナル。世界観は **THE RECORD**、トーンは命令形・断定形（NIKE 寄り）。

**このリポジトリはバックエンド専用（2026-07〜、#101）。** API routes + Supabase migrations + mcp-server のみを含む。クライアントはネイティブ iOS アプリ（別リポ、TestFlight 配信中）。Web UI（`components/` / `app/page.tsx` / デザインシステム一式）は廃止済み。`/` へのアクセスは `next.config.js` の `redirects()` で [yuzu.style](https://yuzu.style)（マーケティングサイト、別リポ）へ転送する。

詳細は次のドキュメントを参照：

- [README.md](README.md) — 思想・コンセプト・世界観（公開フロント）
- [ARCHITECTURE.md](ARCHITECTURE.md) — 技術スタック・ディレクトリ構成・ローカル開発・Supabase セットアップ・検証フロー
- [PRD.md](PRD.md) — プロダクト要件・機能仕様・品質基準（事業/価格/GTM はリポジトリに含めない。Web UI 前提の記述は歴史的文書として残っている）
- [docs/deploy.md](docs/deploy.md) — 本番デプロイ・マイグレーション・ロールバック手順

**DESIGN.md は廃止。** デザインシステムと UI コピー規約は現在ネイティブ iOS リポジトリ側で管理する。このリポジトリにビジュアル/コピーの source-of-truth はない。

## ディレクトリマップ

```
app/
  api/                  サーバ API（1 ルート 1 行）
    account/            アカウント削除（App Store Guideline 5.1.1(v) 対応。service_role で auth ユーザー削除、関連テーブルは on delete cascade）
    account/tokens/      個人用アクセストークンの発行/一覧/削除（MCP 連携用。Cookie 専用の残置、Bearer 対応は別 issue）
    analyze-sentiment/    投稿の感情スコア分析（Anthropic。1 リクエスト上限あり、直近 30 日に限定）
    health/               Supabase keepalive 兼ヘルスチェック（GitHub Actions cron から叩く。service_role で count(*) のみ）
    inquiries/            問い合わせフォーム保存（Cookie 専用の残置。Slack 通知は SLACK_WEBHOOK_URL 設定時のみ）
    insights/heatmap/     時間帯 x 曜日のセンチメントヒートマップ
    insights/themes/      繰り返しテーマ抽出（Anthropic + theme_cache 永続キャッシュ）
    insights/words/       頻出ワード分析
    mcp/records/          MCP サーバー向け records 読み取り（PAT Bearer 認証のみ）
    mcp/reports/          MCP サーバー向け reports 読み取り（PAT Bearer 認証のみ）
    me/                   自分の role / plan / limits を返す（ネイティブアプリの admin メニュー表示判定用）
    records/              投稿の作成・一覧（Post.index はレスポンス生成時に算出。DB には保存しない）
    records/[id]/mark/    投稿の MARK トグル（本文は編集不可、marked カラムのみ UPDATE 許可）
    reports/               レポート一覧（scope=recent|all）
    reports/[periodKey]/   レポート詳細（closed 期間は内容不変。private キャッシュ）
    transcribe/            ElevenLabs Scribe（scribe_v2）で音声 → テキスト
  layout.tsx             最小 root layout（html/body のみ。フォント・メタデータ・Analytics は撤去済み）
lib/                    サーバユーティリティ
  types.ts              共通型（Post, Phase）。Post は user_id / char_count / index を持つ
  period.ts             JST 固定の週/月境界
  streak.ts             連続日数（tests/streak.test.ts が import。サーバ側の実体は get_streak RPC、後述）
  sentimentSeries.ts    JST 集約のセンチメント時系列（lib/reports.ts が import）
  reports.ts            Anthropic でレポート生成（**Anthropic SDK を import するのはここだけ**）
  entitlements.ts       plan/role → Entitlements（上限値）解決。getEntitlements が唯一のゲート点
  plan.ts               プランロール（Free/Light/Premium）型 + getUserPlan（サーバ）。書込は service_role のみ
  mockFixtures.ts       モックモード用固定データ（X-Yuzu-Mock: 1 + role=admin 限定。DB/外部 API に触れない。旧 lib/mockReports.ts・lib/mockPosts.ts の内容を移植済み）
  personalAccessToken.ts 個人用アクセストークンの生成（`yuzu_pat_` prefix）/ SHA-256 ハッシュ照合
  mcpAuth.ts             `/api/mcp/*` 用 Bearer トークン認証（admin client + 明示 user_id フィルタ）
  heatmap.ts / themes.ts / wordAnalysis.ts / sentimentScore.ts  各 insights API のロジック本体
  concurrency.ts         並行実行制御ユーティリティ
  constants.ts           上限値などの定数（MAX_DAILY_SESSIONS / MAX_RECORD_MS 等）
  inquiries.ts           問い合わせのレート制限ロジック
  slack.ts               Slack Webhook 通知
  supabase/
    server.ts           Route Handler 用 createClient（cookie 連携）+ getAuthedClient（Bearer 優先、無ければ cookie。#100 ネイティブ対応）
    admin.ts             service_role クライアント（RLS バイパス。サーバ専用）
middleware.ts は撤去済み（保護ルート `/reports` `/settings` は Web UI と共に廃止。認証判定は各 API route 内で行う）
supabase/config.toml    Supabase CLI 設定（ローカル検証・drift 検知専用、本番 apply は引き続き手動）
supabase/migrations/    init 〜（CLI 互換のタイムスタンプ命名。番号順=時系列順）
supabase/verify/        migration 適用後の権限検証 SQL（Studio で手実行）
tests/                  vitest ユニットテスト（純粋ロジックのみ。period/streak/highlightWords/wordAnalysis/entitlements/inquiries/personalAccessToken/mockFixtures）
mcp-server/             Claude Desktop 用スタンドアロン MCP サーバー（個人用。get_records / get_reports の2ツール。Next.js アプリとは別の npm パッケージ。詳細は [mcp-server/README.md](mcp-server/README.md)）
.github/workflows/      ci.yml（typecheck + lint + test + build）/ migration-drift.yml（未適用 migration 検知。secrets/vars 設定済み・稼働中）/ supabase-keepalive.yml
```

## API 規約

- **認証は [lib/supabase/server.ts](lib/supabase/server.ts) の `getAuthedClient`。** `Authorization: Bearer <access_token>` を優先し、無ければ Cookie セッションにフォールバックする（#100、ネイティブアプリは Bearer / レガシー Web セッションは Cookie）。未ログインは 401 を返す
- **`/api/mcp/*` は PAT Bearer のみ**（Cookie セッション不可。MCP サーバーはブラウザを持たないため）。[lib/mcpAuth.ts](lib/mcpAuth.ts) の `authenticateMcpRequest` が個人用アクセストークン（`personal_access_tokens` テーブル、SHA-256 ハッシュ照合）を検証し、admin client + 明示 `user_id` フィルタで読み取る。`/api/records` や `/api/reports` と同じ組み立てロジックを意図的に重複させている箇所がある（認証境界が異なるため共有すると既存ルートの回帰リスクが上がる）
- **`/api/account/tokens` と `/api/inquiries` は Cookie 専用の残置。** Bearer 対応は別 issue（ネイティブアプリからのアカウント削除・問い合わせは未対応）
- **エンタイトルメントは [lib/entitlements.ts](lib/entitlements.ts) の `getEntitlements` が唯一のゲート点。** `profiles.plan` + `profiles.role` から解決。`role = "admin"` は上限バイパス（`maxDailySessions` / `maxRecordMs` が `null`）。admin のみ `X-Yuzu-Simulate-Plan: free|light|premium` ヘッダで通常ユーザーのゲート挙動を再現できる（`app/api/me/route.ts` がネイティブアプリの admin メニュー表示判定に応答する）
- **モックモードは `X-Yuzu-Mock: 1` ヘッダ + `role=admin` の組み合わせでのみ有効。** [lib/mockFixtures.ts](lib/mockFixtures.ts) の `isMockRequest` が判定し、該当時は DB にも外部 API（ElevenLabs/Anthropic）にも触れず固定データを返す。旧 `lib/mockReports.ts` / `lib/mockPosts.ts`（Web UI 用）はここに内容を移植した上で削除済み

## コーディング規約（観察された慣行）

- **共通型は [lib/types.ts](lib/types.ts)。** Post / Phase などルート間で共有する型はここに集約済み
- **JST 固定の境界は [lib/period.ts](lib/period.ts)。** ローカルタイムで日付を割らない。`jstDateString` / `jstSundayStart` / `jstMonthStart` / `parsePeriodKey` を使う
- **Anthropic SDK は [lib/reports.ts](lib/reports.ts) 内のみで import。** 他のサーバコードから共有したいロジックは [lib/sentimentSeries.ts](lib/sentimentSeries.ts) のように SDK 非依存ファイルに切り出す
- **エラーハンドリングは silent fail 禁止。** `/api/records` POST の失敗を silent catch しない。エラーはステータスコード/エラーコードとしてレスポンスに出す。`catch {}` で握り潰すとクライアント（ネイティブアプリ）側で「何が起きたか分からない」バグが量産される
- **デバッグ困難バグは「複数層の silent failure」が重なって起きる**ことが多い。過去のインシデント（クライアント側 stale closure + 当時無効だった STT モデル ID + `/api/records` POST の silent catch、の3層）を教訓に、新規コードでは silent fail を許さない方針

### Supabase の使い分け

- **Route Handler**：`lib/supabase/server.ts` の `getAuthedClient(request)` を使う。Bearer（ネイティブ）優先、Cookie（レガシー Web セッション）にフォールバック。未ログインは 401 を返す。例：[app/api/records/route.ts](app/api/records/route.ts)
- **service_role（RLS バイパス）**：`lib/supabase/admin.ts`。レポート保存など RLS でカバーできないサーバ専用処理のみで使う。**絶対にクライアントへ import しない**（このリポジトリにクライアントは無いが、mcp-server や将来のバンドル混入を防ぐ意味で徹底する）
- **認証手段は 3 つだけ**：Apple Sign In / Google OAuth / Magic Link（`signInWithOtp`、OTP パスコード方式）。**パスワード認証 UI は作らない**（ネイティブ側の実装。バックエンドは Supabase Auth 標準フローに依存するのみ）
- **保護ルートの概念は Web UI 廃止と共に撤去。** `middleware.ts` は削除済み。認証チェックは各 API route 内の `getAuthedClient` 呼び出しに一本化されている

## 既知の注意

- `lib/streak.ts` の `computeStreak` はクライアント（ネイティブアプリ）向けの補助ロジックとしてテストのみ残っている。サーバ側の実際のストリーク計算は `supabase.rpc('get_streak')`（**現行は `supabase/migrations/20260529095947_fix_get_streak.sql`**、JST 固定・引数なし・`auth.uid()` ベース）
- **ストリークは「今日 or 昨日まで続いていれば切れない」が正**（今日まだ未投稿でも維持）。**過去に 0003 の RPC が壊れていた**（連続判定式が `d - rn(desc)` で連続日でもグループが割れる + `get_streak(uid uuid)` を引数なし呼び出しで解決できず常に 0）。0007 相当（`fix_get_streak`）で式を `d + rn(desc)` に修正・引数なし化・`security definer`+`grant` を付与
- Supabase テーブルに新規テーブルを足したら **RLS ポリシーと別に `GRANT` も必要**。「Automatically expose new tables」OFF の場合は `grant select, insert on public.<table> to authenticated;` を手で打つ（過去にこれで `permission denied for table records` を踏んだ）
- **service_role は postgres ロールを継承していない**（最近の Supabase 仕様）。`createAdminClient()` で書き込むテーブルにも明示的に `grant select, insert, update on public.<table> to service_role;` が必要。`has_table_privilege('service_role', 'public.<table>', 'INSERT')` で確認できる。過去に records / reports / theme_cache / profiles で GRANT 欠落を踏んだ（修正前はレポート生成と PATTERN キャッシュが silent fail していた）。新規テーブルを足す時は必ず authenticated と service_role 両方への GRANT を migration に書く
- `Post.index` は DB に保存しない。`/api/records` GET / POST で `total_count - position` から算出してレスポンスに含める（INDEX は永久欠番なし・編集削除不可前提）
- **STT は ElevenLabs Scribe `scribe_v2`**（現行公開モデル。`no_verbatim=true` でフィラー「えーと/あの」等を除去）。アップストリームへの FormData ファイル名は録音 blob の `type` から拡張子を導出する（Safari/macOS Chrome は mp4 を選ぶので `.webm` 固定だと ElevenLabs 側で format 判定が外れて空文字になる）。詳細は [app/api/transcribe/route.ts](app/api/transcribe/route.ts) の `pickExtension`
- **annotation は `tag_audio_events=false` で抑止する**：`[音楽]` / `(背景ノイズ)` / `（咳）` 等の非音声 annotation は記録に残したくないので、Scribe にそもそも出力させない。受信テキストは空白正規化 + trim のみ。`text.length < 5` で silent reject（クライアント側で「無音、話せ」「短い、話せ」相当のフィードバックを出す前提）。`no_verbatim` でフィラーだけの発話が短文化して弾かれるのは望ましい挙動
- **`/api/records` POST の失敗を silent catch しない**（上記コーディング規約と重複するが再掲するほど重要）。ステータスコード／エラーコードを必ずレスポンスに出す
- **個人用アクセストークンは平文を DB に保存しない**：発行時に `lib/personalAccessToken.ts` の `generateToken()` が `yuzu_pat_` prefix 付きトークンを返し、SHA-256 ハッシュ（`token_hash`）のみ永続化、平文は発行レスポンスの一度きり。再表示・復元は不可、失くしたら削除して再発行
- **`20260626003830_personal_access_tokens.sql` は本番適用済み**（このリポジトリの migration は自動デプロイされない点は引き続き注意。新規 migration は `supabase db push --linked` で適用する）
- **`20260629070634_revoke_public_function_execute.sql`（旧 0015）は本番適用済み**（`mcp__supabase__list_migrations` で確認済、2026-07-02。本番の追跡テーブル上は version `20260628220005` として記録されている＝後述の番号ズレの一例）。内容: Postgres は `CREATE FUNCTION` 時に EXECUTE を **PUBLIC へ自動付与**するため、過去 migration が `grant ... to authenticated` だけ書いていても anon が `/rest/v1/rpc/<fn>` を叩けた。集計 RPC（`get_streak` / `get_total_duration_ms`）を PUBLIC から剥がし authenticated のみに、トリガー専用関数（`handle_new_user` / `rls_auto_enable`）を全ロールから剥奪（トリガー発火は所有者権限なので無影響）。さらに `inquiries` の直接 INSERT 攻撃面を閉じた：`/api/inquiries` は service_role 経由でしか書かないので、`inquiries_insert_any`（`with check (true)`）ポリシーと anon/authenticated の INSERT 権限を撤去し、API 層のレート制限（[lib/inquiries.ts](lib/inquiries.ts)）を迂回した直接 POST を不能にした。検証は [supabase/verify/0015_function_execute_check.sql](supabase/verify/0015_function_execute_check.sql)
- **本番未適用の migration は現在ゼロ**（2026-07-16、Issue #131 対応で 5 本を `supabase db push --linked` で適用済み）。`report_jobs` / `anon_stt_rate_limit`（#52）/ `profiles_role`（admin 機能・plan simulate の前提）/ `create_record_rpc`（#139 原子化）/ `start_report_job_rpc`（#143 原子化）。うち `20260702075418_report_jobs.sql` は追跡テーブル未記録のまま内容だけ先行適用されていたことが判明し、スキーマ・RLS・GRANT の完全一致を確認した上で `migration repair --status applied` で記録のみ追加した。verify SQL（EXECUTE 権限・GRANT・RLS）とオーナー admin シード（role=admin）も確認済み。以後、未適用 migration が発生したらこの位置にリストを復活させること
- **Supabase CLI を `supabase init` でローカル導入した（2026-07-02）。ただし本番の migration 追跡には使えていない状態**：`supabase/migrations/` は CLI 互換のタイムスタンプ命名（`YYYYMMDDHHMMSS_name.sql`）にリネーム済みだが、本番の `supabase_migrations.schema_migrations` には**別のタイムスタンプ・別の粒度**で記録された過去分（`theme_cache` / `plan_entitlement` / `inquiries` + `inquiries_service_role_grants` / `theme_cache_error` / `grant_profiles_to_service_role` / `grant_service_role_dml` / `revoke_public_function_execute`）が入っている（過去に `mcp__supabase__apply_migration` 経由で適用された際、適用時刻ベースの version が自動採番されたため）。**→ この追跡ズレは 2026-07-16 に解消済み（Issue #131/#132）**：`supabase migration repair` で不一致 version 8 行を reverted、既適用分 + 先行適用されていた `20260702075418` を applied として同期した。以後 `supabase migration list --linked` は正しい差分を返し、`supabase db push --linked --dry-run` → `--yes` が migration 適用の正規手順（MCP の `apply_migration` は適用時刻ベースの version を採番して再びズレを作るので使わない）。[.github/workflows/migration-drift.yml](.github/workflows/migration-drift.yml) は secrets/vars（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` / `SUPABASE_PROJECT_ID`）を 2026-07-16 に設定済み・稼働中。設定作業中に**2つの独立したバグ**を発見・修正した：(1) `jobs.<id>.if` は secrets コンテキストを参照できず作成時から全 push で 0 秒 failure になっていた（af49d1c で修正）、(2) `supabase migration list` 出力の awk 列参照が1つずれており本番未適用の migration があっても絶対に fail しない false negative だった（6cd6d7a で修正）。ダミーの未適用 migration を含むテスト PR（マージ無し・削除済み）で両修正を実地検証済み

## 手動 Supabase ダッシュボード作業の注記

- **Auth メールテンプレは OTP パスコード（`{{ .Token }}`）前提。** Magic Link のクリック URL ではなくパスコード入力（ネイティブアプリの UX）を送る設定になっているか、`Authentication > Email Templates` で確認すること
- **Web 用 Redirect URL（`app.yuzu.style` 系、`/auth/callback`）は撤去してよい。** `app/auth/` ディレクトリ（OAuth/Magic Link コールバックの Route Handler）は Web UI 廃止と共に削除済みで、ネイティブアプリは Supabase Auth の native/deep-link フローを使うため Web の Redirect URL 登録は不要

## 検証コマンド

実装変更後はこれらをパスさせる：

```bash
npx tsc --noEmit       # 型チェック
npm run lint           # next lint
npm run test           # vitest（tests/ の純粋ロジック）
npm run verify          # typecheck + lint + test を一括
npm run build           # next build
```

## Git ワークフロー

- **デフォルトブランチは `main`。** PR を経由せずに直 push する運用が許容されている
- コミットメッセージは日本語 OK、prefix を使う：`feat(scope): / fix: / refactor: / docs: / chore:`
- `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` を末尾に付ける
- 主要な機能ブロックの参考コミット：
  - `feat(complete): RECORDED. カードを画像書き出し可能にする`
  - `feat(streak): 沈黙日を SILENCE. として刻印`
  - `refactor: 型・定数・ロジックの重複を排除、デザインプレビューを実装に同期`
  - `refactor: バックエンド専用リポへ移行（Web UI 撤去、#101）`

## 環境変数

- `ELEVENLABS_API_KEY` — Scribe v2 STT（`scribe_v2` が現行モデル。`no_verbatim` でフィラー除去）
- `ANTHROPIC_API_KEY` — レポート生成（lib/reports.ts）
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase プロジェクト URL（クライアント露出可）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon キー（RLS で保護される）
- `SUPABASE_SERVICE_ROLE_KEY` — service_role キー。**サーバ専用**、`NEXT_PUBLIC_` を絶対付けない（[lib/supabase/admin.ts](lib/supabase/admin.ts) からのみ参照）
- `SLACK_WEBHOOK_URL` — 問い合わせ受信通知（[app/api/inquiries/route.ts](app/api/inquiries/route.ts)）。未設定なら通知スキップ。サーバ専用

`.env.local` は gitignore 済み。本番値は Vercel で設定。Supabase ダッシュボード手動設定（プロバイダ有効化・Redirect URL 登録）は [README.md](README.md) を参照。
