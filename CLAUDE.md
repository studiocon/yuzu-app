# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときの規約。あなた（Claude）に向けて書いている。

## プロジェクトの輪郭

YUZU は「声を加工せずに記録する」音声ジャーナル。世界観は **THE RECORD**、トーンは命令形・断定形（NIKE 寄り）。
詳細は次のドキュメントを参照：

- [README.md](README.md) — 思想・コンセプト・世界観（公開フロント）
- [ARCHITECTURE.md](ARCHITECTURE.md) — 技術スタック・ディレクトリ構成・ローカル開発・Supabase セットアップ・検証フロー
- [PRD.md](PRD.md) — プロダクト要件・機能仕様・品質基準（事業/価格/GTM はリポジトリに含めない）
- [DESIGN.md](DESIGN.md) — 世界観・カラー・タイポ・コンポーネント仕様・VOICE & TONE
- [public/design-preview.html](public/design-preview.html) — デザインの **source-of-truth**（後述）

## ディレクトリマップ

```
app/                    Next.js App Router
  api/                  サーバ API（transcribe, records, reports, analyze-sentiment）
  auth/callback/        Supabase OAuth/Magic Link コールバック
  page.tsx              ルート（録音 + タブ。未ログインなら OnboardingView）
  reports/              レポート一覧 / 詳細（middleware で保護）
  settings/             ニックネーム等（middleware で保護）
  globals.css           デザイントークンと全 CSS（:root は DESIGN.md と CI で突合）
components/             "use client" コンポーネント
  LoginModal.tsx        Apple / Google / Magic Link（パスワード認証なし）
lib/                    型・ユーティリティ・サーバ呼び出し
  types.ts              共通型（Post, Phase）。Post は user_id / char_count / index を持つ
  period.ts             JST 固定の週/月境界
  streak.ts             連続日数 + WEEKDAY_JA（クライアント側ローカルタイム）
  sentimentSeries.ts    JST 集約のセンチメント時系列（サーバ/クライアント共有）
  reports.ts            Anthropic でレポート生成（**Anthropic SDK を import するためクライアントから直接呼ばない**）
  supabase/
    client.ts           ブラウザ用 createBrowserClient
    server.ts           Route Handler / Server Component 用 createServerClient（cookie 連携）
    admin.ts            service_role クライアント（RLS バイパス。サーバ専用）
  userClient.ts         ニックネーム・センチメントキャッシュ（localStorage キャッシュ層）
  prompts.ts            投稿促進プロンプト（B 案）
  dailyLimit.ts         1 日 3 回制限（localStorage）
  useBodyScrollLock.ts  モーダル open 時の body overflow 制御
middleware.ts           Supabase セッション更新 + /reports・/settings 保護
supabase/migrations/    0001_init / 0002_reports / 0003_streak
public/
  design-preview.html   デザインの実体プレビュー（source-of-truth）
scripts/
  check-design-drift.mjs    DESIGN.md frontmatter ↔ globals.css :root の突合
  sync-design-preview.mjs   DESIGN.md frontmatter → design-preview.html へ反映
.github/workflows/      PR で `npm run design:drift` + lint
```

## デザイン同期ワークフロー（最重要）

**source-of-truth は [public/design-preview.html](public/design-preview.html)。** 視覚要素を変えるときは preview HTML 起点で考える。

1. デザイントークン（CSS 変数）の変更：
   - [DESIGN.md](DESIGN.md) 冒頭の `cssVars:` frontmatter を編集 → `npm run design:sync` で preview に反映 → [app/globals.css](app/globals.css) の `:root` を同じ値に更新
   - `pre-commit` フックが DESIGN.md ステージ時に `design:sync` を自動実行する
   - 検証：`npm run design:check`（drift 検出 + Google design.md linter）
2. UI コピー（VOICE & TONE）の変更：
   - 実装側を変えたら DESIGN.md `§4 Voice & Tone` の表と design-preview.html の VOICE 表も同期する
3. コンポーネント形状の変更：
   - design-preview.html の該当 mock を更新 → DESIGN.md §6 を更新 → 実装を更新

DESIGN.md と globals.css の不整合は CI（[.github/workflows/design-check.yml](.github/workflows/design-check.yml)）で落ちる。

## コーディング規約（観察された慣行）

このリポジトリで既に確立されているパターン。新規コードは合わせる：

- **共通型は [lib/types.ts](lib/types.ts)。** Post / Phase などコンポーネント間で共有する型はここに集約済み
- **JST 固定の境界は [lib/period.ts](lib/period.ts)。** ローカルタイムで日付を割らない（`new Date().getDate()` 系を直接使わない）。`jstDateString` / `jstSundayStart` / `jstMonthStart` / `parsePeriodKey` を使う
- **共通フックは `lib/use*.ts`。** 例：[lib/useBodyScrollLock.ts](lib/useBodyScrollLock.ts)
- **Anthropic SDK は [lib/reports.ts](lib/reports.ts) 内のみで import。** クライアントコンポーネントからは絶対 import しない（バンドル肥大化）。クライアントが共有したいロジックは [lib/sentimentSeries.ts](lib/sentimentSeries.ts) のように SDK 非依存ファイルに切り出す
- **モーダル系コンポーネントは AnimState の状態機械 + `useBodyScrollLock`。** 既存の [RecordModal.tsx](components/RecordModal.tsx) / [IndexDetailModal.tsx](components/IndexDetailModal.tsx) / [LoginModal.tsx](components/LoginModal.tsx) のパターンを踏襲（`opening` → `open` → `closing`）
- **エラーハンドリングは silent fail + 状態リセット。** トーンとしてユーザーに過剰に説明しない（VOICE & TONE で「やさしく」「ふんわり」が NG）
- **`box-shadow` / `filter: drop-shadow` は禁止（例外 2 件のみ）。** 階層は罫線（`--divider` / `--surface-border`）と余白だけで作る（DESIGN.md §5）。例外は下部ドックの `.tab-bar` と `.fab-record` のみ（Liquid Glass 質感を共有）。それ以外のコンポーネントに `box-shadow` を書いたらレビューで弾く
- **角丸は最小限。** `border-radius` は 0 / 2px(`--radius-sharp`) / 4px(ボタン類) / 9999px(`--radius-pill`、マイクボタン)。`blob` 形状・モーフィングは使わない
- **ナビは 2 タブ + 独立 FAB（v2.1〜）。** `LOG` / `INSIGHT` の 2 タブ pill ([components/TabBar.tsx](components/TabBar.tsx)) と、その右に並ぶ正円録音 FAB ([components/RecordFab.tsx](components/RecordFab.tsx)) を [app/page.tsx](app/page.tsx) でレンダリング。内部タブ ID は互換のため `index` / `read`、表示ラベルだけ `LOG` / `INSIGHT`。**旧 3 タブ `TALK / INDEX / REPORT` 構成・YUZU ロゴヘッダー・「BE TRUE / 本物でいろ」ヒーロー・`.mic-fab` クラスはすべて撤去済**。これらの用語/クラスを復活させない
- **ヘッダーは `.app-header-title` でページ名を最大級（48px）に出し、画面内見出し（`.mypage-section-title` 18px）はそれより小さくする。** ページ階層を視覚的に確立するための約束。新規ビューで画面内 h2 を大きく置きたくなったら `app-header-title` を見直す方が正解
- **下部ドックは pill + FAB の横並び 296px グループを viewport 中央寄せ。** `left: calc(50% - 148px)` (pill) / `left: calc(50% + 84px)` (FAB) で位置決め、`transform` は hover/scale/hidden 専用に分離。位置と装飾を transform で重ねると hover 毎に位置がリセットされる事故が起きるので分けている
- **タブ pill のアクティブ表示は `.tab-bar::before` の 1 枚を `translateX` でスライドさせる（iOS 26 ライク）。** `data-active="index" | "read"` で位置を切替。**タブごとの `::before` で個別に黄色チップを置かない**（瞬間切替になる）。`cubic-bezier(0.32, 0.72, 0, 1)` で 0.42s、`prefers-reduced-motion` は `transition: none`

### Supabase の使い分け

- **ブラウザ（"use client"）**：`createBrowserClient` 経由でセッション読み取り・OAuth・signOut。例：[app/page.tsx](app/page.tsx) の auth state listener、[components/LoginModal.tsx](components/LoginModal.tsx)
- **Route Handler / Server Component**：`lib/supabase/server.ts` の `createServerClient` を使い `await supabase.auth.getUser()` で本人確認。未ログインは 401 を返す。例：[app/api/records/route.ts](app/api/records/route.ts)
- **service_role（RLS バイパス）**：`lib/supabase/admin.ts`。レポート保存など RLS でカバーできないサーバ専用処理のみで使う。**絶対にクライアントへ import しない**
- **認証手段は 3 つだけ**：Apple Sign In（Issue #36）/ Google OAuth / Magic Link（`signInWithOtp`）。**パスワード認証 UI は作らない**
- **保護ルートは [middleware.ts](middleware.ts)** で `PROTECTED = ["/reports", "/settings"]`。未ログインアクセスは `/` にリダイレクトしてオンボーディングを見せる
- **オンボーディングの pending post**：未ログイン状態の STT 結果は `sessionStorage["yuzu_pending_text"]` に退避し、ログイン直後（`app/page.tsx` の auth listener）で `/api/records` に POST → 即削除（多重投稿防止）

## VOICE & TONE（コピーを書く時の鉄則）

DESIGN.md §4 を引く。Claude が UI 文言を提案する時のチェックリスト：

**NG ワード（使ったらやり直し）**：
- 癒し・寄り添う・頑張ろう（muute 寄り）
- 育つ・林・種・香り・果実（旧世界観）
- やさしく・ふんわり・あなたらしく
- 入力・テキスト・記録する（ツールっぽい。「話す」「声」に置換）
- 気づき・自分を知ろう（意識高い系）

**OK 方向**：
- 命令形（話せ・出せ・黙るな）
- 状態英語（RECORDING. / CARVING. / RECORDED. / SILENCE.）
- 句点（.）で終わる短文。詩的にしない・励まさない・優しくしない

英日の使い分け：**英語＝Unbounded＝状態・挑発**、**日本語＝LINE Seed JP＝事実・本文**。

## 検証コマンド

実装変更後はこれらをパスさせる（pre-commit や CI が落ちない状態にしてからコミット）：

```bash
npx tsc --noEmit       # 型チェック
npm run design:check   # DESIGN.md / globals.css のドリフト検出 + linter
npm run dev            # ローカル起動（http://localhost:3000）
```

ブラウザでの UI 確認が必要な変更（preview HTML / globals.css / components/）は preview MCP ツール（`preview_start` 〜 `preview_screenshot`）で実機確認してから完了報告する。

## Git ワークフロー

- **デフォルトブランチは `main`。** PR を経由せずに直 push する運用が許容されている
- コミットメッセージは日本語 OK、prefix を使う：`feat(scope): / fix: / refactor: / docs: / chore:`
- pre-commit フックが DESIGN.md ステージ時に `design:sync` を自動実行し、差分が出たら preview HTML を一緒にステージする
- `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` を末尾に付ける
- 主要な機能ブロックの参考コミット：
  - `feat(complete): RECORDED. カードを画像書き出し可能にする`
  - `feat(streak): 沈黙日を SILENCE. として刻印`
  - `refactor: 型・定数・ロジックの重複を排除、デザインプレビューを実装に同期`

## 環境変数

- `ELEVENLABS_API_KEY` — Scribe v2 STT（`scribe_v2` が現行モデル。`no_verbatim` でフィラー除去）
- `ANTHROPIC_API_KEY` — レポート生成（lib/reports.ts）
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase プロジェクト URL（クライアント露出可）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon キー（RLS で保護される）
- `SUPABASE_SERVICE_ROLE_KEY` — service_role キー。**サーバ専用**、`NEXT_PUBLIC_` を絶対付けない（[lib/supabase/admin.ts](lib/supabase/admin.ts) からのみ参照）

`.env.local` は gitignore 済み。本番値は Vercel で設定。Supabase ダッシュボード手動設定（プロバイダ有効化・Redirect URL 登録）は [README.md](README.md) を参照。

## サブエージェント

プロジェクト固有のエージェントを [.claude/agents/](.claude/agents/) に用意してある。次の状況で起動を検討：

- **design-sync** — design-preview.html / DESIGN.md / app/ の三者整合性を監査するとき
- **copy-reviewer** — UI コピーが VOICE & TONE 規約に沿っているかチェックするとき

## 既知の注意

- `lib/streak.ts` の `dayKey` は **ローカルタイム**、`lib/period.ts` の `jstDateString` は **JST 固定**。連続日数はユーザー体感（端末ローカル）、レポート集計は JST 固定。混同しない
- ただしサーバ側ストリークは `supabase.rpc('get_streak')`（**現行は `supabase/migrations/0007_fix_get_streak.sql`**、JST 固定・引数なし・`auth.uid()` ベース）。クライアント `lib/streak.ts` は SILENCE 描画 + 投稿直後の即時反映用の補助
- **ストリークは「今日 or 昨日まで続いていれば切れない」が正**（今日まだ未投稿でも維持）。`lib/streak.ts` の `computeStreak` は今日が無投稿なら昨日起点で数え直す。サーバ `get_streak` も同じ挙動。**過去に 0003 の RPC が壊れていた**（連続判定式が `d - rn(desc)` で連続日でもグループが割れる + `get_streak(uid uuid)` を引数なし呼び出しで解決できず常に 0、+ クライアントも今日未投稿で 0）。3層の silent fail が重なって「昨日投稿したのに STREAK 0」を起こしていた。0007 で式を `d + rn(desc)` に修正・引数なし化・`security definer`+`grant` を付与。**0007 は本番 Supabase に手動適用が必要**
- `app/page.tsx` で `phase` state と `phaseRef` を二重管理しているのは、ポインタイベントハンドラ内で同期的に最新値を読む必要があるため。`setPhaseSync` を必ず通す
- `app/page.tsx` の `user` state は **三値**（`undefined` = ロード中 / `null` = 未ログイン / `User` = ログイン済み）。`isLoaded = user !== undefined` / `isOnboarding = user === null` の判定を維持
- Supabase テーブルに新規テーブルを足したら **RLS ポリシーと別に `GRANT` も必要**。「Automatically expose new tables」OFF の場合は `grant select, insert on public.<table> to authenticated;` を手で打つ（過去にこれで `permission denied for table records` を踏んだ）
- `Post.index` は DB に保存しない。`/api/records` GET / POST で `total_count - position` から算出してレスポンスに含める（INDEX は永久欠番なし・編集削除不可前提）
- **`lib/use*.ts` のカスタムフックで親から渡された関数を `useCallback(..., [])` で握らない**。`useRecorder` で「録音→CARVING.（旧 DECODING）→モーダルが閉じて保存されない」事故あり（2026-05）。`onTranscribed` が初回レンダー時の `user === undefined` を握り続けて `!user` 分岐に常に落ちていた。**親から受け取るコールバックは `useRef` に逃がして `ref.current(...)` で呼ぶ**こと（[lib/useRecorder.ts](lib/useRecorder.ts) の `onTranscribedRef` / `isAtDailyLimitRef` / `transcribeRef` パターン参照）
- **STT は ElevenLabs Scribe `scribe_v2`**（現行公開モデル。`no_verbatim=true` でフィラー「えーと/あの」等を除去）。アップストリームへの FormData ファイル名は録音 blob の `type` から拡張子を導出する（Safari/macOS Chrome は mp4 を選ぶので `.webm` 固定だと ElevenLabs 側で format 判定が外れて空文字になる）。詳細は [app/api/transcribe/route.ts](app/api/transcribe/route.ts) の `pickExtension`
- **annotation は `tag_audio_events=false` で抑止する**：`[音楽]` / `(背景ノイズ)` / `（咳）` 等の非音声 annotation は記録に残したくないので、Scribe にそもそも出力させない（旧実装の正規表現 strip ハックは廃止済み）。受信テキストは空白正規化 + trim のみ。`text.length < 5` で silent reject → `useRecorder.ts` の `showHint("無音、話せ")` / `showHint("短い、話せ")`。`no_verbatim` でフィラーだけの発話が短文化して弾かれるのは望ましい挙動
- **`/api/records` POST の失敗を silent catch しない**。`recorder.failWithError(msg)` でステータスコード／エラーコードを SpeakView に出す。`catch {}` で握り潰すと「モーダルが busy のまま」 or 「モーダル閉じて何も起きない」の原因不明バグが量産される（ユーザは何が起きたかわからず、DevTools を開ける人しか報告できなくなる）
- **デバッグ困難バグは「複数層の silent failure」が重なって起きる**ことが多い。今回の保存されない事故は (1) `useRecorder` の stale closure、(2) 当時 `scribe_v2` が無効なモデル ID だった（※現在は v2 が現行で有効）、(3) `/api/records` POST の silent catch、の3層が重なって診断不能になっていた。新規コードでは silent fail を許さない方針
