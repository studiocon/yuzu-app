# YUZU 本番デプロイ手順書

> このドキュメントは GitHub issue #59 由来。audit-2026-05 でマージされた DB スキーマ変更（0004 / 0005）と API 認証強化を本番に反映する手順。

---

## 1. 事前チェック

### 1-1. CI ステータス

- [main の最新 commit で GitHub Actions が両方緑](https://github.com/studiocon/yuzu-app/actions)
  - `CI` (typecheck + lint + build)
  - `Design check` (drift + linter)

### 1-2. ローカルで本番ビルド確認

```bash
npm ci
npm run verify          # typecheck + lint + design:check
npm run build           # production build
```

エラーなく完了すること。

---

## 2. Supabase 本番への migration 適用

> dev DB（ステージング Supabase プロジェクト）で先に同じ手順を試すこと。
> 本番に直接適用する前にロールバック手順 (§5) を頭に入れておくこと。

### 2-1. 適用順（番号順、戻り不可）

`supabase/migrations/` 配下を順番に Supabase Dashboard → SQL Editor で実行する:

| # | ファイル | 内容 | 既適用？ |
|---|---|---|---|
| 0001 | init.sql | profiles / records テーブル + RLS + トリガー | ✅ |
| 0002 | reports.sql | reports テーブル + RLS | ✅ |
| 0003 | streak.sql | get_streak() RPC（JST 連続日数） | ✅ |
| 0004 | mark.sql | records.marked カラム + UPDATE RLS | ✅ |
| 0005 | records_column_grants.sql | INSERT/UPDATE カラム単位 GRANT | ✅ |
| 0006 | records_duration.sql | duration_ms + get_total_duration_ms() RPC | ✅ |
| 0007 | fix_get_streak.sql | get_streak() 修正 | ✅ |
| 0008 | theme_cache.sql | theme_cache テーブル + RLS SELECT + GRANT（#79） | ✅（MCP 適用・migration 追跡済） |
| 0009 | plan.sql | profiles に plan 列（Free/Light/Premium）+ check + authenticated UPDATE 剥奪（#102） | ✅（MCP 適用済） |

> 既適用状態は本番 Supabase の `select * from supabase_migrations.schema_migrations;` で確認（無ければ手動運用のため適用ログを README にメモする）。

### 2-2. 適用手順

1. Supabase Dashboard → **SQL Editor**
2. New Query で `20260524173200_mark.sql` の内容を貼り付け → **RUN**
3. 同じく `20260524173201_records_column_grants.sql` → **RUN**
4. エラーが出たら即停止して原因調査。0005 が一部成功して一部失敗していたら §5 のロールバック SQL で戻す。

### 2-3. 適用後の検証

`supabase/verify/0005_grants_check.sql` を **authenticated ロールとして** 実行する（Auth → Users → 任意のユーザーで Impersonate）。

期待結果は同ファイルのコメント参照。要点:
- ① `update records set text=...` → permission denied
- ② `created_at` / `char_count` / `user_id` も全て denied
- ③ `marked` のトグルだけは通る
- ④ `insert ... marked=true returning marked` → `false` が返る
- ⑤ 他人の row への `update` → 0 rows

5 項目すべてクリアなら本番 DB は OK。

---

## 3. Vercel 環境変数

Vercel Dashboard → 該当 Project → **Settings → Environment Variables**

| 変数 | スコープ | 値の出どころ | NEXT_PUBLIC_ |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production / Preview / Development | Supabase → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 | Supabase → API → `anon` `public` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production のみ** | Supabase → API → `service_role` `secret` | ❌ **絶対に付けない** |
| `ELEVENLABS_API_KEY` | Production / Preview | elevenlabs.io → API Keys | ❌ |
| `ANTHROPIC_API_KEY` | Production / Preview | console.anthropic.com | ❌ |

### 検証

Vercel CLI が入っていれば:

```bash
vercel env ls production
```

または Dashboard 上で:
- [ ] `SUPABASE_SERVICE_ROLE_KEY` に `NEXT_PUBLIC_` プレフィックスが付いていない
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が **Preview / Development には設定されていない**（誤って漏洩しないため）
- [ ] すべての変数が `Encrypted` 表示

---

## 4. 本番 smoke test

main を Vercel にデプロイ後、本番 URL で実機チェック。

### 4-1. INDEX 表示

- [ ] ログイン → `#NNN` ヘッダー / STATS (DAY / RECORDS / STREAK) / EMOTION が表示
- [ ] スクロールして RECORD カードが順に出る
- [ ] 100 件以上ある場合: 末尾までスクロールで追加読み込み (`LOADING.` フラッシュ → 続きが出る)

### 4-2. 録音フロー

- [ ] 中央 TALK FAB タップ → RecordModal が flyout アニメで開く
- [ ] マイク長押し → `RECORDING` 表示・波形が動く
- [ ] 離す → `CARVING` → CompleteView の `CARVED` + `#NNN`
- [ ] 「戻る」で閉じる → INDEX 先頭に新 record + `#NNN` がインクリメント

### 4-3. MARK / COPY

- [ ] RECORD カード右端のピンタップ → 色が `--yuzu-zest` に + `MARKED` フラッシュ
- [ ] PINNED フィルタタップ → 該当カードのみ表示
- [ ] COPY タップ → ペースト先に「`#NNN  YYYY/MM/DD HH:MM\n本文`」が入る

### 4-4. REPORT タブ

- [ ] REPORT タブ → 週次レポートカードが横スクロール
- [ ] レポートカード → `/reports/[periodKey]` 詳細遷移

### 4-5. 設定

- [ ] ヘッダー右上の歯車 → `/settings` 遷移
- [ ] 未ログインで `/settings` 直アクセス → `/` にリダイレクト

### 4-6. 1 日上限（重要 / サーバ強制）

- [ ] 1 日 3 回投稿後、4 回目を試みる → サーバが 429 daily_limit → LimitView 表示
- [ ] **別端末でログイン**して試みる → 同じく LimitView（カウントが端末間で同期）

### 4-7. 未ログイン onboarding

- [ ] 未ログインで録音 → STT 成功 → 「記録する」で LoginModal
- [ ] **2 回目の録音を試みる** → サーバが 429 login_required → LoginModal が自動 open

### 4-8. 編集禁止思想（最重要）

ブラウザ DevTools コンソールで以下を実行（ログイン済セッション）:

```js
const sb = window.supabase ?? null; // exposed されていない場合は別タブで Supabase JS を直接叩く
// もしくは curl + access_token で:
//   curl -X PATCH 'https://<proj>.supabase.co/rest/v1/records?id=eq.<rid>' \
//     -H 'apikey: <ANON_KEY>' -H 'Authorization: Bearer <ACCESS_TOKEN>' \
//     -H 'Prefer: return=representation' \
//     -d '{"text":"hacked"}'
```

- [ ] レスポンス → `permission denied for column "text"` または 403
- [ ] 本文が変わっていないことを INDEX で確認

---

## 5. ロールバック

### 5-1. アプリのロールバック

Vercel Dashboard → Deployments → 直前の deploy → **Promote to Production**

### 5-2. DB のロールバック（0005 が原因の場合のみ）

`supabase/verify/0005_rollback.sql` を **service_role モード** で実行:

```sql
revoke insert (user_id, text, char_count) on public.records from authenticated;
revoke update (marked)                    on public.records from authenticated;
grant insert on public.records to authenticated;
grant update on public.records to authenticated;
```

> このロールバックを実行すると **編集禁止思想（PRD §8）のガードが外れる**。
> 一時的な緊急回避としてのみ使用し、原因究明後に必ず 0005 を再適用すること。

### 5-3. 0004 のロールバック（推奨しない）

`marked` カラム自体は残しておいて問題ない（client が無視するだけ）。
どうしても消す場合:

```sql
drop policy if exists "records_update_mark_own" on public.records;
alter table public.records drop column if exists marked;
```

---

## 6. 適用ログ

> 本番に適用したら以下を埋めて commit。

| Migration | 適用日 | 適用者 | 検証 |
|---|---|---|---|
| 20260524173200_mark.sql | YYYY-MM-DD | @owner | ✅ |
| 20260524173201_records_column_grants.sql | YYYY-MM-DD | @owner | ✅ |
