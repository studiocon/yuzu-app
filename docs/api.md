# API Contract

YUZU（Next.js App Router）の全 API エンドポイントの契約。ネイティブアプリ（yuzu-native）・MCP サーバー（mcp-server/）実装者向けのリファレンス。

> **注記**: このドキュメントは Issue #133（Bearer 認証統一）・#129（inquiries IP レート制限フォールバック）・#128（record_sentiments サーバキャッシュ）の内容を反映した最終形として書かれている。これら3件の PR がマージされるまでは一部の記述（`account/tokens` の Bearer 対応、`inquiries` の IP フォールバック、`analyze-sentiment` のサーバキャッシュ）は実装に反映されていない。マージ後に正確になる。

対象コード: `app/api/**/route.ts` 全ファイル（2026-07-17 時点、上記3 PR 込み）。

---

## 1. 認証

### 1.1 方式

| 方式 | 対象 | ヘッダ / Cookie |
|---|---|---|
| **Bearer（Supabase access token）** | Web（推奨に移行中）・ネイティブアプリ全般 | `Authorization: Bearer <supabase_access_token>` |
| **Cookie セッション（レガシー）** | Web の旧経路 | Supabase SSR が発行する Cookie 一式 |
| **Bearer（個人用アクセストークン, PAT）** | `/api/mcp/*` のみ | `Authorization: Bearer yuzu_pat_...` |

- `lib/supabase/server.ts` の `getAuthedClient(request)` が Bearer / Cookie の両方を透過的に扱う。`Authorization: Bearer <token>` があればそれを Supabase の anon key + 明示 Authorization ヘッダで検証し、無ければ Cookie セッションにフォールバックする。
- `/api/mcp/*`（`app/api/mcp/records`, `app/api/mcp/reports`）だけは別経路。`lib/mcpAuth.ts` の `authenticateMcpRequest` が **PAT のみ**を検証する（Cookie は一切見ない。MCP サーバーはブラウザを持たないため）。PAT は `yuzu_pat_` prefix、DB には SHA-256 ハッシュのみ保存される。
- **Bearer 対応ルート一覧**（`getAuthedClient` 経由。#133 で `account/tokens` と `inquiries` を追加）: `records`, `records/[id]/mark`, `transcribe`, `analyze-sentiment`, `insights/*`, `reports`, `reports/[periodKey]`, `me`, `account`, `account/tokens`, `inquiries`
- `inquiries` の POST は**未ログイン（匿名）でも呼べる**。`getAuthedClient` の `user` が `null` でも 401 にせず処理を続ける唯一のルート。

### 1.2 未認証時のレスポンス

Bearer/Cookie いずれでも認証できない保護ルートは統一して:

```json
{ "error": "unauthorized" }
```
`status: 401`

（`app/api/reports/route.ts` の GET のみ `{ "error": "unauthorized", "reports": [] }` と `reports` フィールドを併せて返す。クライアントが `reports` を直接参照しても壊れないための配慮）

---

## 2. 管理者限定ヘッダ

| ヘッダ | 対象 | 効果 |
|---|---|---|
| `X-Yuzu-Mock: 1` | role=admin のユーザーのみ | Anthropic / DB に触れず決定的なフィクスチャ応答を返す（ストア審査用スクリーンショット撮影のため）。`lib/mockFixtures.ts` の `isMockRequest` がゲート。role が admin でなければヘッダは無視され通常動作する |
| `X-Yuzu-Simulate-Plan: free\|light\|premium` | role=admin のユーザーのみ | admin の上限バイパスを一時的に解除し、指定プランの一般ユーザーとして `maxDailySessions` / `maxRecordMs` 等のゲートを再現する。`lib/entitlements.ts` の `getEntitlements` が処理 |

いずれも role 照会が発生するのは `X-Yuzu-Mock` ヘッダ自体が付いているリクエストのみ（ヘッダが無ければゼロコスト）。

### 2.1 プランゲート（billing、#65 Phase B）

サーバ環境変数 `BILLING_ENABLED`（既定未設定 = off）で PLUS の課金ゲートを一括切り替えする。`lib/entitlements.ts` の `resolveEntitlements` が唯一の集約点：

- **`BILLING_ENABLED` 未設定 or `"1"` 以外**: 現状維持。`canUseThemes` / `canUseAllReports` は plan に関わらず常に `true`（既存ユーザーへの回帰なし）。ただし 1 日の録音回数・1 回あたりの録音時間の上限は `BILLING_ENABLED` に関わらず plan に応じて即時反映される（`free` → `MAX_DAILY_SESSIONS`(1) / `MAX_RECORD_MS`(60秒)、`light`/`premium` → `PLUS_MAX_DAILY_SESSIONS`(3) / `PLUS_MAX_RECORD_MS`(120秒)。現在 `light`/`premium` ユーザーは存在しないため実質無害）。
- **`BILLING_ENABLED="1"` かつ role が admin ではない場合**: `plan === "free"` のユーザーのみ `canUseThemes: false` / `canUseAllReports: false` になる。`light`/`premium` は引き続き `true`。role=admin は常に両方 `true`（バイパス）。
- `X-Yuzu-Simulate-Plan` ヘッダ（§2 表）と組み合わせれば、admin アカウントで `BILLING_ENABLED="1"` の free ユーザー挙動を再現できる。
- `canUseThemes=false` は `GET /api/insights/themes` を、`canUseAllReports=false` は `GET/POST /api/reports/[periodKey]`（ユーザーの最初の1件の生成レポート以外）と `GET /api/reports` の `locked` フィールドをそれぞれ左右する。詳細は §6 の各エンドポイント。

---

## 3. `maxDaily: null` の契約（ネイティブ実装者への警告）

`GET/POST /api/records` と `POST /api/transcribe` のレスポンスに含まれる `maxDaily` は **`number | null`**。

- **`null` = 無制限**（role=admin）。
- **数値 = その値が 1 日の録音上限**（一般ユーザーは現在 `MAX_DAILY_SESSIONS = 1`）。

> ⚠️ **実際に踏まれたバグ**: ネイティブ側で `maxDaily` を受け取る際に `null` を `0` に丸めて扱った実装があり、admin ユーザーが「上限 0 回」＝録音不能になった。`null` と `0` を混同しないこと。`maxDaily == null` を明示的にチェックしてから数値として扱う（`??` や `|| 0` で潰さない）。

同じ意味論が `lib/entitlements.ts` の `maxRecordMs`（録音1回あたりの最大 ms）にもある。`null` はサーバ側で `ABSOLUTE_MAX_RECORD_MS`（60分）にのみ clamp される「実質無制限」。

---

## 4. レート制限一覧

| 対象 | 上限 | 判定キー | 応答 |
|---|---|---|---|
| 未ログイン STT（`/api/transcribe`） | `ANON_DAILY_STT_LIMIT`（現在 1 回/日、JST） | HttpOnly cookie（`yuzu_anon_stt`）+ IP（`anon_stt_usage` テーブル、二重防波堤） | `429 { error: "login_required", maxAnon, resetAt }` |
| ログイン済み録音（`/api/records` POST, `/api/transcribe`） | `maxDailySessions`（一般 1 回/日、admin は `null`=無制限、JST） | `user_id` | `429 { error: "daily_limit", todayCount, maxDaily, resetAt }` |
| 感情解析（`/api/analyze-sentiment`） | `MAX_POSTS_PER_REQUEST = 50` 件/リクエスト | リクエストごとの post 数 | `400 { error: "too_many_posts", max, received }` |
| 個人用アクセストークン発行数（`/api/account/tokens` POST） | `MAX_TOKENS_PER_USER = 10` | `user_id` | `429 { error: "too_many_tokens" }` |
| 問い合わせ（`/api/inquiries` POST） | `INQUIRY_RATE_MAX = 5` 件 / `INQUIRY_RATE_WINDOW_MS`（1時間） | ログイン済みは `user_id`。匿名は `email` と **IP** の**両方**でカウントし max で判定（#129。email ローテートでも同一 IP から 5件/時を超えられない） | `429 { error: "rate_limited", retryAfterMs }` |

IP 取得は `lib/ip.ts` の `getClientIp`（#142 XFF 偽装対策済み。`x-vercel-forwarded-for` → `x-real-ip` → `x-forwarded-for` 先頭値の順に信頼し、Vercel エッジが付与しない値は使わない）に統一されている。`transcribe` の匿名 IP カウントと `inquiries` のレート制限の両方がこれを経由する。IP が特定できない場合（`"unknown"`）は inquiries のレート制限キーとして使わない（全匿名ユーザーが誤って同一バケットを共有する事故を避けるため）。

**429 応答の共通形**: エンドポイントごとに body の中身は異なるが、常に `status: 429` かつ `error` フィールドに機械可読なコードを持つ。

---

## 5. エラーコード一覧

API 全体で使われる `error` 値（機械可読）。ルートごとの詳細は各セクション参照。

| コード | 意味 | 代表的な発生元 |
|---|---|---|
| `unauthorized` | 未認証（Bearer/Cookie とも無効 or 無し） | 保護ルート全般 |
| `login_required` | 未ログイン onboarding の STT 上限到達 | `transcribe` |
| `daily_limit` | 1日の録音上限到達 | `records` POST, `transcribe` |
| `rate_limited` | レート制限超過 | `inquiries`, `analyze-sentiment`（Anthropic 429 伝播） |
| `too_many_posts` | 感情解析の1リクエスト上限超過 | `analyze-sentiment` |
| `too_many_tokens` | PAT 発行数上限到達 | `account/tokens` POST |
| `too_long` | 文字数上限超過 | `records` POST（`MAX_RECORD_TEXT`）, `inquiries`（`INQUIRY_SUBJECT_MAX`/`INQUIRY_BODY_MAX`） |
| `audio_too_large` | 音声ファイルサイズ超過（`MAX_AUDIO_BYTES`） | `transcribe` |
| `no_posts` | 対象期間の投稿がゼロ | `reports/[periodKey]` POST |
| `not_generated` | レポート未生成（キャッシュも進行中ジョブも無い） | `reports/[periodKey]` GET |
| `period_in_progress` | 進行中（未確定）期間はレポート対象外 | `reports/[periodKey]` GET/POST |
| `invalid_period_key` | periodKey の形式不正 | `reports/[periodKey]` GET/POST |
| `llm_not_configured` | `ANTHROPIC_API_KEY` 未設定 | `reports/[periodKey]` POST |
| `insert_failed` / `update_failed` / `delete_failed` / `fetch_failed` | DB 操作失敗（詳細はサーバログのみ、応答には出さない） | 各ルート |
| `internal_error` | 想定外のサーバエラー | 各ルート |
| `invalid_json` | リクエストボディの JSON パース失敗 | `records/[id]/mark`, `inquiries` |
| `missing_fields` | 必須フィールド欠如 | `inquiries` |
| `plan_required` | Free プランのゲート対象（billing 有効化後のみ発生。#65 Phase B） | `insights/themes` GET、`reports/[periodKey]` GET/POST |

---

## 6. エンドポイント

### `GET /api/me`
- 認証: 必須（Bearer/Cookie）
- 自分の role / plan / limits を返す。ネイティブの admin メニュー表示判定用
- 200:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user" | "admin",
    "plan": "free" | "light" | "premium",
    "limits": { "maxDailySessions": number | null, "maxRecordMs": number | null },
    "features": { "billing": boolean, "insightsPreview": boolean }
  }
  ```
  `features.billing` は `BILLING_ENABLED` の現在値そのもの（ネイティブの課金 UI 出し分け用）。`features.insightsPreview` は `!billing`（billing 無効の間は PATTERN/全期間レポートを teaser 無しで見せてよい、の意）

### `GET /api/records`
- 認証: 必須
- クエリ: `?limit=`（既定100、最大200） `?offset=`（既定0）
- 1ページ目のみ集計値（`totalCount`/`streak`/`firstPostAt`/`totalDurationMs`/`todayCount`/`maxDaily`/`resetAt`）を含む。2ページ目以降は `posts`/`nextOffset`/`hasMore` のみ
- `index` は「新しい投稿ほど大きい」連番（`created_at` 昇順ランク）で、永久欠番なし・編集削除不可
- 200: `{ posts: Post[], nextOffset: number|null, hasMore: boolean, totalCount?, streak?, firstPostAt?, totalDurationMs?, todayCount?, maxDaily?: number|null, resetAt? }`
- 401: `{ error: "unauthorized" }`

### `POST /api/records`
- 認証: 必須
- body: `{ text: string, durationMs?: number }`
- `text` は必須・`MAX_RECORD_TEXT`（4000字）まで。`durationMs` は不正値なら 0、`maxRecordMs` で clamp
- 二重 POST でも上限を超えない（`create_record` RPC が advisory lock で check+insert を原子化。RPC 未適用環境では check-then-insert フォールバック）
- 201: `{ post: Post, streak: number, todayCount: number, maxDaily: number|null, resetAt: number }`
- 400: `{ error: "text required" }` / `{ error: "too_long", max }`
- 429: `{ error: "daily_limit", todayCount, maxDaily, resetAt }`

### `PATCH /api/records/[id]/mark`
- 認証: 必須
- body: `{ marked: boolean }`（必須。boolean 以外・パース失敗は 400 で弾く。silent に `false` へフォールバックしない）
- 200: `{ id: string, marked: boolean }`
- 400: `{ error: "invalid_json" }` / `{ error: "marked_required" }`
- 500: `{ error: "update_failed" }`

### `POST /api/transcribe`
- 認証: 任意（未ログインは onboarding 経路として匿名 STT を許容）
- multipart/form-data: `audio`（Blob、`MAX_AUDIO_BYTES` = 25MB まで）
- ログイン済み: `maxDailySessions` で日次上限チェック（`null` なら無制限）
- 未ログイン: cookie（`yuzu_anon_stt`）+ IP カウント（`anon_stt_usage`）の二重チェック、上限 `ANON_DAILY_STT_LIMIT`
- STT は ElevenLabs Scribe `scribe_v2`。`no_verbatim=true`（フィラー除去）、`tag_audio_events=false`（`[音楽]`等の annotation 抑止）
- 200: `{ text: string }`（空/短文はそのまま返す。クライアント側で「無音、話せ」等のヒント表示）
- 401 系は返さない（未ログインでも 200 まで到達しうる設計）。上限到達時のみ 429
- 413: `{ error: "audio_too_large" }`
- 429（未ログイン）: `{ error: "login_required", message: "先に登録しろ。", maxAnon, resetAt }`
- 429（ログイン済み）: `{ error: "daily_limit", todayCount, maxDaily, resetAt }`
- 500: `{ error: "transcribe_failed" }`（ElevenLabs 上流エラー）

### `GET /api/insights/heatmap`
- 認証: 必須
- 直近28日の投稿を JST 日付 × 2時間バケットで集計した文字数ヒートマップ
- 200: `{ cells: { date: string, bucket: number (0-11), charCount: number }[] }`（`Cache-Control: private, max-age=300`）

### `GET /api/insights/themes`
- 認証: 必須
- **プランゲート（§2.1）**: `!ent.canUseThemes`（billing 有効時の free プラン）は `theme_cache` を読む前に 403 `{ error: "plan_required" }`（cache read-around 無し）
- Claude（`claude-haiku-4-5`）で投稿群から繰り返しテーマを最大5件抽出。`theme_cache` テーブルに永続キャッシュ（post_count の増分 + 経過時間で再生成要否を判定。差分0なら無条件でキャッシュを返す）
- 投稿数が `MIN_POSTS_FOR_THEMES`（10件）未満: `{ themes: [], notEnough: true, needed: 10 }`
- 200: `{ themes: { theme: string, description: string, count: number }[] }`
- 403: `{ error: "plan_required" }`
- 502: `{ error: "parse failed" }` / `{ error: "anthropic call failed" }`（失敗も negative cache に書き、5分間は再課金せず同じエラーを返す）

### `GET /api/insights/words`
- 認証: 必須
- 直近 `MAX_POSTS_FOR_WORDS`（500件）の投稿から TinySegmenter で語頻度を抽出（上位20件）
- 200: `{ words: { word: string, count: number }[] }`（`Cache-Control: private, max-age=300`）

### `POST /api/analyze-sentiment`
- 認証: 必須
- body: `{ posts: { id: string, createdAt?: number }[] }`（**id のみ**。本文はサーバの `records` から引く。text 送信は受け付けない＝捏造防止）
- 所有権チェック: `user_id` フィルタ + UUID 形式検証 + 直近30日窓（`SENTIMENT_WINDOW_MS`）。他人の record / 存在しない id は空振り
- 上限: `MAX_POSTS_PER_REQUEST = 50` 件/リクエスト
- **#128 以降**: `record_sentiments` テーブルへの write-through キャッシュ。キャッシュ済み分は Claude を呼ばずそのまま返し、未キャッシュ分のみ Haiku 4.5 で解析して結果を `service_role` で upsert する。クライアントから見た request/response 契約は変わらない（キャッシュの有無は透過的）
- 200: `{ results: { postId: string, date: string, score: number (-1..1) }[] }`（解析できなかった post は結果から除外される。0 を焼き付けない）
- 400: `{ error: "too_many_posts", max, received }`
- 429: `{ error: "rate_limited" }`（Anthropic 側 429 の伝播）
- 502: `{ error: "sentiment_failed" }`

### `GET /api/reports`
- 認証: 必須
- クエリ: `?scope=recent`（既定、直近4週+前月） `?scope=all`（直近12週分の候補 + 保存済み全期間の和集合）
- **プランゲート（§2.1）**: `!ent.canUseAllReports`（billing 有効時の free プラン）の場合、ユーザーが最初に生成したレポート（`generated_at` 最古）の `periodKey` 以外は全て `locked: true` になる。`locked: true` のエントリは `headline` / `topics` / `payload` が**省かれる**（メタデータ＝`periodKey`/`kind`/`rangeStart`/`rangeEnd`/`label`/`generated`/`postCount`/`generatedAt`/`model`/`locked` のみ。内容の一覧レスポンス経由でのリークを防ぐ）。1件もレポートが無いユーザーは全期間 `locked: false`（teaser 対象がまだ確定していないため）
- 200: `{ reports: ReportMeta[] }`（`generated` が false でも `postCount > 0` なら一覧に含む＝未生成だが対象期間には投稿がある、をクライアントに伝える）
- 401: `{ error: "unauthorized", reports: [] }`
- 500: `{ error: "internal_error", reports: [] }`

`ReportMeta` 形状: `{ periodKey, kind: "week"|"month", rangeStart, rangeEnd, label, generated, headline?, topics?, postCount, payload?: ReportPayload, generatedAt?, model?, locked?: boolean }`（`locked` は追加フィールド。billing 無効時・PLUS/admin は常に `locked: false`）

### `GET /api/reports/[periodKey]`
- 認証: 必須。読み出し専用（生成は POST）
- `periodKey` 形式: `w-YYYY-MM-DD`（JST 日曜始まり週）または `m-YYYY-MM`。正規化されていない・実在しない日付は 400
- 未確定（進行中）期間は 422
- **プランゲート（§2.1）**: `!ent.canUseAllReports` の場合、この `periodKey` がユーザーの最初に生成したレポートでなければ 403 `{ error: "plan_required" }`。既存キャッシュの読み出しより先に判定する（cache read-around 無し＝billing 有効化後に降格したユーザーが以前生成済みの非対象期間を読めてしまうことは無い）
- 200: `{ report: Report }`（`Cache-Control: private, max-age=300, stale-while-revalidate=86400`）
- 202: `{ status: "pending" }`（生成ジョブが実行中。クライアントはポーリング継続）
- 403: `{ error: "plan_required" }`
- 404: `{ error: "not_generated" }`
- 422: `{ error: "period_in_progress" }`
- 400: `{ error: "invalid_period_key" }`
- 502: `{ error: string, status: "failed" }`（生成ジョブが失敗済み）

`Report` 形状: `{ user_id, periodKey, kind, rangeStart, rangeEnd, payload: { headline, topics, fact, proof, shadow, advice, adviceDetail, sentimentSeries: {date,score}[] }, generatedAt, model }`

### `POST /api/reports/[periodKey]`
- 認証: 必須
- body（任意）: `{ scores?: Record<postId, score> }`（クライアントが既に持っているスコアを渡すとサーバ側 Claude 呼び出しを節約できる。渡されなかった分はサーバが `scoreSentiments` で補完）
- **プランゲート（§2.1）**: GET と同じ判定を生成起動より先に行う。ユーザーがまだ1件もレポートを生成していなければ（`oldestPeriodKey === null`）どの `periodKey` でも通す＝それが最初の1件として永続的に無料開放される。既に1件あれば、その `periodKey` 以外は 403 `{ error: "plan_required" }`（二重生成抑止のキャッシュ確認より前）
- 生成はレスポンス後もバックグラウンド継続（`waitUntil`）。**待たない**：即座に 202 を返しクライアントは GET でポーリングする
- 二重生成は `start_report_job` RPC が原子的に防止（先着のみ実行、後発は 202 pending で相乗り）
- 202: `{ status: "pending" }`
- 200: `{ report: Report }`（既にキャッシュ済みの場合は生成せず即返す）
- 403: `{ error: "plan_required" }`
- 404: `{ error: "no_posts" }`（対象期間の投稿がゼロ）
- 422 / 400: 上記 GET と同じ
- 503: `{ error: "llm_not_configured" }`

### `DELETE /api/account`
- 認証: 必須
- 本人アカウントを削除（`records`/`reports`/`theme_cache`/`profiles` は `on delete cascade` で連鎖削除）。唯一の退出口
- 200: `{ ok: true }`
- 500: `{ error: "delete_failed", code: "delete_failed" }`

### `GET /api/account/tokens`
- 認証: 必須
- 自分の PAT 一覧（平文は二度と返さない）
- 200: `{ tokens: { id, name, tokenPrefix, createdAt, lastUsedAt }[] }`

### `POST /api/account/tokens`
- 認証: 必須
- body（任意）: `{ name?: string }`（40字まで、既定 "MCP"）
- 平文トークンはこのレスポンス限りでのみ返る（DB には SHA-256 ハッシュのみ保存）
- 201: `{ token: "yuzu_pat_...", id, name, tokenPrefix, createdAt, lastUsedAt }`
- 429: `{ error: "too_many_tokens" }`（`MAX_TOKENS_PER_USER = 10`）

### `DELETE /api/account/tokens?id=<uuid>`
- 認証: 必須。本人のトークンのみ失効可能
- 200: `{ ok: true }`
- 400: `{ error: "id required" }`

### `POST /api/inquiries`
- 認証: **任意**（未ログイン POST を許容する唯一のルート）
- body: `{ subject: string, body: string, email?: string }`（`subject` ≤ `INQUIRY_SUBJECT_MAX`(200), `body` ≤ `INQUIRY_BODY_MAX`(4000)。`email` は緩い形式チェックのみ）
- レート制限: 5件/時。ログイン済みは `user_id` キー、匿名は `email` と **IP** の両方でカウントし max で判定（#129。email は自己申告値でローテート可能なため単独キーにしない）
- 保存は `service_role`（anon/authenticated は table SELECT 権限を持たないため `.insert().select()` の chained SELECT が失敗する。admin client を使う設計）
- Slack 通知（`SLACK_WEBHOOK_URL` 未設定ならスキップ、失敗しても 201 は返す）
- 201: `{ id: string, ok: true }`
- 400: `{ error: "invalid_json" }` / `{ error: "missing_fields" }` / `{ error: "too_long" }`
- 429: `{ error: "rate_limited", retryAfterMs }`

### `GET /api/mcp/records`
- 認証: **PAT Bearer のみ**（`Authorization: Bearer yuzu_pat_...`。Cookie/Supabase access token は不可）
- クエリ: `?limit=`（既定100、最大500） `?since=`（ISO日時） `?until=`（ISO日時）
- 200: `{ records: { id, text, durationMs, createdAt, marked }[], count: number }`
- 401: `{ error: "unauthorized" }`

### `GET /api/mcp/reports`
- 認証: **PAT Bearer のみ**
- クエリ: `?scope=recent`（既定） `?scope=all`
- 200: `{ reports: ReportMeta[] }`（`/api/reports` と同じ形状。認証境界が異なるため実装は意図的に重複させている）
- 401: `{ error: "unauthorized" }`
- 500: `{ error: "internal_error", reports: [] }`
- **注意（#65 Phase B 前提の既知ギャップ）**: このルートは §2.1 のプランゲートを**意図的に適用していない**（`locked` フィールドも `plan_required` 403 も無い）。個人用アクセストークン経由の読み取り専用パスであり、billing launch 時にどう扱うかは Phase B で別途検討する

### `GET /api/health`
- 認証: 不要（無認証・GitHub Actions cron から毎日叩かれる Supabase keepalive 兼ヘルスチェック）
- `service_role` で `profiles` に軽量 SELECT を実行し DB 到達性を確認するのみ。DB エラーの詳細は応答に出さずサーバログのみに残す
- 200: `{ ok: true, t: number, durationMs: number, rows: number }`
- 503: `{ ok: false, stage: "env"|"query"|"exception", durationMs: number }`

---

## 7. 型リファレンス

```ts
type Post = {
  id: string;
  user_id: string;
  text: string;
  createdAt: number;   // Unix ms
  char_count: number;
  durationMs: number;
  index: number;        // 1-based。新しい投稿ほど大きい。永久欠番なし・編集削除不可
  marked: boolean;
};

type ReportPayload = {
  headline: string;
  topics: string[];
  fact: string;
  proof: string;
  shadow: string;
  advice: string;
  adviceDetail: string;
  sentimentSeries: { date: string; score: number }[];
};

type Report = {
  user_id: string;
  periodKey: string;    // "w-YYYY-MM-DD" | "m-YYYY-MM"
  kind: "week" | "month";
  rangeStart: number;
  rangeEnd: number;
  payload: ReportPayload;
  generatedAt: number;
  model: string;
};
```

---

## 8. 関連ドキュメント

- [ARCHITECTURE.md](../ARCHITECTURE.md) — 技術スタック・ローカル開発・Supabase セットアップ
- [CLAUDE.md](../CLAUDE.md) — リポジトリ規約（silent fail 禁止・GRANT の罠・認証パターン等）
- [mcp-server/README.md](../mcp-server/README.md) — MCP サーバー（`get_records` / `get_reports`）の詳細
