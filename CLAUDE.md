# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業するときの規約。あなた（Claude）に向けて書いている。

## プロジェクトの輪郭

YUZU は「声を加工せずに記録する」音声ジャーナル。世界観は **THE RECORD**、トーンは命令形・断定形（NIKE 寄り）。
詳細は次のドキュメントを参照：

- [README.md](README.md) — 技術スタック、ローカル開発の手順
- [PRD.md](PRD.md) — プロダクト要件・機能仕様・品質基準
- [DESIGN.md](DESIGN.md) — 世界観・カラー・タイポ・コンポーネント仕様・VOICE & TONE
- [public/design-preview.html](public/design-preview.html) — デザインの **source-of-truth**（後述）

## ディレクトリマップ

```
app/                    Next.js App Router
  api/                  サーバ API（transcribe, posts, reports, analyze-sentiment）
  page.tsx              ルート（録音 + タブ）
  reports/              レポート一覧 / 詳細
  settings/             ニックネーム等
  globals.css           デザイントークンと全 CSS（:root は DESIGN.md と CI で突合）
components/             "use client" コンポーネント
lib/                    型・ユーティリティ・サーバ呼び出し
  types.ts              共通型（Post, Phase）
  period.ts             JST 固定の週/月境界
  streak.ts             連続日数 + WEEKDAY_JA
  sentimentSeries.ts    JST 集約のセンチメント時系列（サーバ/クライアント共有）
  reports.ts            Anthropic でレポート生成（**Anthropic SDK を import するためクライアントから直接呼ばない**）
  kv.ts                 Upstash Redis（lazy 接続）
  userClient.ts         ニックネーム・絵文字・センチメントキャッシュ（localStorage）
  prompts.ts            投稿促進プロンプト（B 案）
  useBodyScrollLock.ts  モーダル open 時の body overflow 制御
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
- **モーダル系コンポーネントは AnimState の状態機械 + `useBodyScrollLock`。** 既存の [RecordModal.tsx](components/RecordModal.tsx) / [IndexDetailModal.tsx](components/IndexDetailModal.tsx) のパターンを踏襲
- **エラーハンドリングは silent fail + 状態リセット。** トーンとしてユーザーに過剰に説明しない（VOICE & TONE で「やさしく」「ふんわり」が NG）
- **`box-shadow` / `filter: drop-shadow` は禁止。** 階層は罫線（`--divider` / `--surface-border`）と余白だけで作る（DESIGN.md §5）
- **角丸は最小限。** `border-radius` は 0 / 2px(`--radius-sharp`) / 4px(ボタン類) / 9999px(`--radius-pill`、マイクボタン)。`blob` 形状・モーフィングは使わない

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
- 状態英語（RECORDING. / DECODING. / RECORDED. / SILENCE.）
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

- `ELEVENLABS_API_KEY` — Scribe v2 STT
- `ANTHROPIC_API_KEY` — レポート生成（lib/reports.ts）
- `KV_URL` 等 — Upstash Redis（lib/kv.ts、未設定時は API が `kv_not_configured` を返す）

`.env.local` は gitignore 済み。本番値は Vercel で設定。

## サブエージェント

プロジェクト固有のエージェントを [.claude/agents/](.claude/agents/) に用意してある。次の状況で起動を検討：

- **design-sync** — design-preview.html / DESIGN.md / app/ の三者整合性を監査するとき
- **copy-reviewer** — UI コピーが VOICE & TONE 規約に沿っているかチェックするとき

## 既知の注意

- `lib/streak.ts` の `dayKey` は **ローカルタイム**、`lib/period.ts` の `jstDateString` は **JST 固定**。連続日数はユーザー体感（端末ローカル）、レポート集計は JST 固定。混同しない
- `app/page.tsx` で `phase` state と `phaseRef` を二重管理しているのは、ポインタイベントハンドラ内で同期的に最新値を読む必要があるため。`setPhaseSync` を必ず通す
