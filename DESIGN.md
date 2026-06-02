<!--
  YAML frontmatter: design tokens のソースオブトゥルース。
  CI が `scripts/check-design-drift.mjs` で `app/globals.css` の :root と突合する。
  値を変えるときは CSS と frontmatter の両方を更新すること。

  NOTE: デザインシステムの実体プレビューは public/design-preview.html。
        プレビューを編集したら DESIGN.md / app/globals.css / components の3点に同期する。
-->
---
name: YUZU
tagline: BE TRUE
tagline_ja: 本物でいろ
typography:
  display: Unbounded
  body: LINE Seed JP
cssVars:
  # YUZU Primary
  --yuzu-yellow:      "#F5D84A"
  --yuzu-zest:        "#E8A020"
  --yuzu-white:       "#FAFAF5"
  # Text
  --ink:              "#1A1A2E"
  --ink-secondary:    "#4A4A6A"
  --ink-muted:        "#9A9ABA"
  # Surface
  --surface-card:     "#fff"
  --surface-border:   "#E8E0C8"
  --surface-hover:    "#FFF5CC"
  --divider:          "#EDEAE0"
  --icon-bg:          "rgba(26, 26, 46, 0.06)"
  --mood-low:         "#6F84A6"
  # Easing
  --ease-organic: "cubic-bezier(0.34, 1.56, 0.64, 1)"
  --ease-soft:    "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
  --ease-snap:    "cubic-bezier(0.68, -0.55, 0.27, 1.55)"
  # Type scale
  --text-xs:   "11px"
  --text-sm:   "13px"
  --text-base: "15px"
  --text-lg:   "18px"
  --text-xl:   "24px"
  --text-2xl:  "32px"
  --text-3xl:  "48px"
  # Font stacks
  --font-body: 'LINE Seed JP', "Hiragino Kaku Gothic ProN", Meiryo, sans-serif
---

# YUZU - Design Document

> BE TRUE / 本物でいろ

---

## 1. デザインコンセプト

### 世界観

**「整っていない。それが本物だ。」**

加工しない。整えない。ナマのまま。
装飾を削ぎ落とすこと自体が `Raw` の表現になる。
YUZU の世界観は **THE RECORD**。
比喩を持たず、声が信号として記録される装置そのものをデザインする。

### プロダクトの態度

YUZU は **ミラー（突きつける）** であって、サポーター（隣で励ます）ではない。
muute が "肩を抱く" のに対し、YUZU は "胸ぐらを掴む"。
答えを返さない・介在しない潔さが、デザイン全体を貫く原則。

### キーワード

```
Raw          → 加工なし・生っぽさ・ナマ
Cool         → かっこいい習慣・ライフスタイル
Swiss Grid   → グリッド・余白・タイポ駆動
Provocative  → 挑発的・断定的・命令形（NIKE 寄り）
```


---

## 2. カラーパレット

CSS変数として [app/globals.css](app/globals.css) の `:root` に定義。
新世界観では **ゆず黄を信号色** として極端に絞って配置し、それ以外は無彩色で構成する。

```css
/* YUZU Primary */
--yuzu-yellow: #F5D84A;   /* ゆず黄：信号色・アクセント */
--yuzu-zest:   #E8A020;   /* 完熟オレンジ：録音中・強調 */
--yuzu-white:  #FAFAF5;   /* オフホワイト：背景単色 */

/* Text */
--ink:           #1A1A2E;
--ink-secondary: #4A4A6A;
--ink-muted:     #9A9ABA;

/* Surface / Divider */
--surface-card:   #fff;
--surface-border: #E8E0C8;
--surface-hover:  #FFF5CC;
--divider:        #EDEAE0;  /* リスト・カード区切りの最弱罫線。--ink-muted より十分薄い */
```

### 罫線の使い分け

リスト要素や軽い区切りは `--divider` を使う。`--ink-muted` をボーダーに使うとリストが並んだとき視覚的にうるさくなるため、テキスト用に留める。

### 背景

**オフホワイト単色 `#FAFAF5`** のみ。ゆず黄が信号として浮く構造。

```css
body { background: var(--yuzu-white); }
```

---

## 3. タイポグラフィ

- 英字・ロゴ・タブラベル・スタッツ数値・状態ラベル: **Unbounded**（`--font-display`、`font-weight: 700` 基本、ロゴは `900`、極端に大きく画面端まで攻める）
- 日本語本文・コピー・タイムスタンプ: **LINE Seed JP**（`--font-body`、`font-weight: 400 / 700`）

LINE Seed JP のジオメトリックで角丸な骨格はミニマル・スイス美学と親和性が高く、日本語の表情を保ちつつ無装飾を支える。

フォント読み込みは [app/layout.tsx](app/layout.tsx) で以下の二系統：

- **Unbounded** — `next/font/google` 経由で CSS 変数 `--font-display` を `<html>` に注入。
- **LINE Seed JP** — Google Fonts CDN を `<link rel="stylesheet">` で読み込む（Next 14.2 の `next/font/google` 内蔵リストに LINE Seed JP が未収録のため CDN 直読み）。`--font-body` は [app/globals.css](app/globals.css) の `:root` で `'LINE Seed JP', system-fallback…` を定義。

グローバル CSS と個別クラスは必ず `var(--font-display)` / `var(--font-body)` 経由で参照し、ハードコードされた `'LINE Seed JP'` 等は使わない。

### フォント適用ルール

| 対象 | フォント | ウェイト |
|---|---|---|
| ロゴ「YUZU」 | Unbounded | 900 |
| タグライン「BE TRUE」 | Unbounded | 700 |
| タグライン（日）「本物でいろ」 | LINE Seed JP | 700 |
| タブラベル・状態ラベル（英語） | Unbounded | 700 |
| スタッツ数値 | Unbounded | 700 |
| 日本語UI・投稿テキスト・プロンプト | LINE Seed JP | 400 / 700 |
| タイムスタンプ | Unbounded | 400 |

### 段組ルール

- **デフォルトは左揃え**（見出し・本文・空状態テキストを含む）
- **中央揃えは例外的に許容**：以下のケースのみ。それ以外は左揃え。
  - スタッツカード（DAY / RECORDS / STREAK）— 数字とラベルの縦組み
  - マイクボタン（FAB／モーダル内ヒーロー）の正円タップターゲット
  - アイコンボタン内のグリフ
- 段落間は余白で区切る（罫線・装飾は使わない）

サイズスケール: `--text-xs` (11) / `sm` (13) / `base` (15) / `lg` (18) / `xl` (24) / `2xl` (32) / `3xl` (48)。

---

## 4. Voice & Tone

### ブランドトーン

```
短く・力強く・断定的
命令形を恐れない（NIKE 寄り）
詩的にならない・スピリチュアルにならない
フラットでわかりやすい
英語と日本語を意図的に使い分ける
```

### 英日使い分け

- **英語＝Unbounded＝挑発・状態**：`RECORDING.` / `CARVING.` / `RECORDED.` / `DAY` / `RECORDS` / `STREAK`
- **日本語＝LINE Seed JP＝事実・本文・プロンプト**：プロンプト（過去/現在/未来 各10）・エラー・タグライン・本文UI

### muute との対比

| 軸 | muute | YUZU |
|---|---|---|
| 動詞 | 寄り添う・気づく | 話せ・出せ |
| 主語 | あなた | YOU（記号化） |
| 文末 | 〜ですね、〜しよう | 〜だ。〜しろ。 |
| 装飾 | やわらかい絵文字 | 句点（.）終わり（※見出しは除く） |
| 比喩 | 自然・植物・育つ | 信号・記録・刻印 |

ビジュアル軸でも同様。muute（パステル・水彩・キャラクター）／ Awarefy（ブルー・医療的・グラフ）に対し、YUZU は **単色オフホワイト + 信号黄 + 黒・グリッド・タイポ駆動**。参照群はジャーナリングアプリではなく、Swiss / NIKE / Patta / A-COLD-WALL\* / Off-White / Acne Studios。

### 句点ルール

**見出し（ページ名 / セクション見出し / モーダルタイトル / カード見出し）は句点なし。**
句点（. / 。）が付くのは次の 2 つに限る：
1. **状態英語**（`RECORDING.` / `CARVING.` / `RECORDED.` / `SILENCE.` / `SAVING.` 等の pill / バッジ / ステータス表示）
2. **本文の断定形短文**（説明・トースト・空状態テキスト・シェアキャプション等）

### NGワード

```
「癒し」「寄り添う」「頑張ろう」     → muute っぽい
「育つ」「林」「種」「香り」「果実」 → YUZU の世界観に反する
「やさしく」「ふんわり」「あなたらしく」→ ミニマルに反する
「入力」「テキスト」「記録する」      → ツールっぽい（「話す」に統一）
「気づき」「自分を知ろう」           → 意識高い系
```

### UIコピー

**コードを正とする**（実装と乖離したらコードに合わせて更新する）。

**録音フロー（RecordModal / CompleteView）**

| 場所 | コピー |
|---|---|
| 待機（マイクボタン下） | 長押し。話せ |
| 録音中 | RECORDING. |
| 変換中（声→テキスト） | CARVING. |
| 投稿完了 | RECORDED. |
| マイク不許可 | マイクを許可しろ |
| 音声なし | 無音、話せ |
| 短すぎ | 短い、話せ |
| 完了画面 STATS | MINUTES / STREAK |
| 完了画面 閉じる | 閉じる |
| 1日上限到達（3/3） | 今日はここまで。明日また話せ。 |
| 残り回数（<3 のとき） | `{N} LEFT.` |

**オンボーディング（未ログイン）**

| 場所 | コピー |
|---|---|
| 変換完了（未保存） | CARVED. |
| 保存ボタン | 刻む |
| 再録音ボタン | もう一度 |

**LOG タブ（IndexView / RecordCard）**

| 場所 | コピー |
|---|---|
| STATS ラベル | RECORDS / MINUTES / STREAK |
| INDEX 通し番号（identity 兼） | `#NNN`（ゼロ埋め3桁） |
| RECORDS フィルタ | ALL / MARKED |
| タイムライン空（ALL） | 話せ。 |
| MARKED 空表示 | MARK されたものは無い。 |
| 追加読み込み中 | LOADING. |
| MARK 操作直後 | MARKED. |
| COPY 操作直後 | COPIED. |
| 沈黙の刻印（録音なし日） | SILENCE. |
| INDEX 詳細 STATS | LENGTH（録音時間 ○:○○）/ DAY（○ 日目） |

**INSIGHT タブ（InsightView ほか）**

| 場所 | コピー |
|---|---|
| セクションラベル | EMOTION / SIGNAL / WORDS / PATTERN / REPORTS（句点なし・Unbounded） |
| 全セクション ロード中 | 読み取り中 |
| 全セクション エラー | 失敗、話せ |
| EMOTION プレビュー（データ不足） | PREVIEW. |
| WORDS / SIGNAL 空表示 | まだ声がない |
| SIGNAL Tooltip | `MM/DD HH:00 / N CHARS`（HH はバケット先頭時刻 00/04/08/12/16/20） |
| PATTERN 投稿不足（< 10件） | もっと話せ、パターンが見えてくる |
| PATTERN テーマなし | まだパターンがない |
| PATTERN 順位 / シェア率 | `#N`（--ink-muted）/ `NN%`（--ink） |
| REPORTS 空（見出し / 説明） | NOTHING TO READ YET. / 沈黙は記録されない、話せ |
| レポート生成中 | 読み取り中 |
| レポート生成失敗 | 失敗、話せ |

**レポート詳細（ReportDetail）**

| 場所 | コピー |
|---|---|
| セクション見出し | EMOTION / TOPICS / SURFACE / DEPTH / ADVICE |
| 投稿なしの期間 | この期間は何も無い |
| 進行中の期間 | まだ進行中の期間だ |
| 再試行ボタン | RETRY |

**ログイン（LoginModal）**

| 場所 | コピー |
|---|---|
| 大見出し（ステップ別） | SIGN IN → MAIL → SENT |
| OAuth ボタン | Apple で続ける / Google で続ける |
| Magic Link 導線 | メールで続ける |
| メール送信ボタン | 送れ（送信中 …） |
| 入力に戻る | 戻る |
| 送信エラー | 送れなかった。もう一度。 |

**マイルストーン共有（SignalCardModal）**

| 場所 | コピー |
|---|---|
| カード見出し | `DAY {N}` / `VOICE {N}` |
| 画像保存ボタン | 画像を保存（保存中 SAVING.） |
| シェアボタン | X でシェア |

**設定・アカウント削除（settings / DeleteAccountModal）**

| 場所 | コピー |
|---|---|
| 削除導線（行） | アカウントを削除 |
| 確認モーダル見出し | 全部消す |
| 確認モーダル本文 | 記録も、番号も、戻らない。 |
| 入力プロンプト | YUZU と打て。 |
| 実行 / 取消ボタン | 消す（削除中 削除中…）/ やめる |
| 削除失敗 | 削除できなかった。もう一度。 |

### 投稿促進プロンプト

マイクボタン上にランダム表示。毎セッションで変わる。実体は [lib/prompts.ts](lib/prompts.ts)。
**過去 / 現在 / 未来 の 3 系統 × 各 10 = 30 件**。命令形・断定形で「整える前の声」を引き出す。代表例：

```javascript
// lib/prompts.ts（抜粋。全 30 件はファイルを参照）
過去: '言ってないことは？', '引きずっていることはあるか？', '後悔してることはあるか？'
現在: '今、一番気になってることは？', '黙ってる場合か？', '10秒でいい。出せ。'
未来: '本当にやりたいことはなんだ？', '明日、一つだけ変えるとしたら？', '理想の自分はなんだ？'
```

---

## 5. フォームとシェイプ

新世界観では **直線・矩形・グリッド**。角丸は最小限。

```css
--radius-0:     0px;   /* グリッド要素・カード */
--radius-sharp: 2px;   /* ボタン・入力等 */
--radius-pill:  9999px; /* マイクボタン（正円） */
```

シグネチャーシェイプ「歪んだ楕円（blob）」は使わない。`--blob-*` / `--blob-soft-*` トークンおよび `blob-pulse` アニメは実装から除外している。

### シャドウ

**`box-shadow` は使わない。** 浮き出し・ふんわりした立体感はミニマル／スイス美学に反する。階層は罫線（`--divider` / `--surface-border`）と余白だけで作る。`filter: drop-shadow` も同様に避ける。

**唯一の例外：下部ドック（タブバー pill + 録音 FAB）の Liquid Glass 質感**。フローティング要素は背景と物理的に分離する必要があるため、`box-shadow: 0 10px 30px rgba(26,26,48,0.10), 0 2px 8px rgba(26,26,48,0.06), inset 0 1px 0 rgba(255,255,255,0.5)` + `border: 1px solid rgba(255,255,255,0.6)` を許容する。これ以外（カード・ボタン・モーダルなど通常コンポーネント）には絶対適用しない。

---

## 6. コンポーネント

### マイクボタン (`.mic-button` in [globals.css](app/globals.css))

| 状態 | 外観 |
|---|---|
| デフォルト | **正円** + `--yuzu-yellow` 背景 + 🎤 |
| ホバー | わずかに拡大（scale 1.04） |
| 録音中 (recording) | `--yuzu-zest` + 同心円リング |
| 変換中 (busy) | スピナー |

形状は固定の正円。「blob モーフィング」「blob-pulse」は使わない。

### 投稿カード (`.post-card`) — v2 Raw 矩形

```
┌──────────────────────────────────────┐
│ たった今                       #020  │ ← 1行ヘッダー
│ 最高、とは言わないけど、悪くない。     │ ← 本文（~5 行で省略）
└──────────────────────────────────────┘
```

- アイコン・名前は **持たない**（identity は `#NNN` のみ）
- 1行ヘッダー: タイムスタンプ（Unbounded 400 / `--ink-muted`）+ `#NNN`（Unbounded / `--ink-muted`）。**MARK / COPY ボタンはカードに置かない**（詳細モーダル側へ集約）。
- 本文は LINE Seed JP（`--ink`）。**一覧では `-webkit-line-clamp: 5` で ~5 行に省略**（全文は詳細モーダルで読む）。
- **カード全体がタップ範囲**（`.post-card--tappable`）。タップ／Enter／Space で INDEX 詳細モーダルを開く。`role="button"` + `tabIndex={0}`、`:hover` は `--surface-hover`、`:focus-visible` は `--yuzu-yellow` アウトライン。
- 角丸は `--radius-sharp`（2px）。`border-top: 1px solid var(--divider)`。MARK 済みは `border-top-color: var(--yuzu-zest)`。
- blob 形状・ホバー時モーフィング・box-shadow は使わない。

### INDEX 詳細 (`.index-detail-modal` in [components/IndexDetailModal.tsx](components/IndexDetailModal.tsx)) — v2

投稿カード（カード全体）をタップすると開く全画面モーダル（`--ink` 背景・白文字）。

```
┌──────────────────────────────────────┐
│                                  [×] │
│  #042                                │ ← identity（縮小・--yuzu-yellow）
│  ┌──────────┐ ┌──────────┐           │
│  │ LENGTH   │ │ DAY      │           │ ← 事実 STATS
│  │ 1:24     │ │ 14       │           │
│  └──────────┘ └──────────┘           │
│  2026.05.29 (木) 23:11               │ ← スタンプ（曜日入り）
│  今日はずっと機嫌が良かった。         │ ← 本文（段落・大きめ・濃いめ）
│                                      │
│  明日も同じならいい。                 │
│  ┌────────┐ ┌────────┐               │
│  │📌 MARK │ │⧉ COPY  │               │ ← 操作行（MARK / COPY）
│  └────────┘ └────────┘               │
└──────────────────────────────────────┘
```

- **役割は「その1件の RECORD をじっくり読む場」**（一覧＝眺める／詳細＝読む、の役割分離）。事実 STATS で文脈を添えつつ、本文を読みやすく整形する。
- `#NNN` は identity の核として残すが、過剰にならないようサイズを抑える（`clamp(64px, 18vw, 120px)`）。
- 事実 STATS は 2 枚：`LENGTH`（録音時間 `m:ss`）/ `DAY`（登録から何日目か）。`CompleteView` の `.complete-stat-*` と同じダーク表現（白文字・`rgba(255,255,255,.18)` 罫線・角丸 `--radius-sharp`）。値は 36px（完了画面の 44px より控えめ）。算出不能な項目はカードごと出さない。
- 本文は **読みやすく整形**：「。」直後で段落（`.index-detail-para`）に分割、段落間 `gap: 14px`、`--text-lg`（一覧 `--text-base` より一回り大きく）、`line-height: 1.85`、色は `rgba(255,255,255,.92)`（読める濃さ）。
- 本文下に **操作行**（`.index-detail-actions`）：`MARK`（PushPin トグル・ON で `--yuzu-zest`）と `COPY`（⚠️ Notion 移行期間限定の一時機能）。ダーク背景に馴染む低主張ボタン（`rgba(255,255,255,.18)` 罫線・角丸 `--radius-sharp`・タッチターゲット 44px 以上）。押下後 `MARKED.` / `COPIED.` をラベルにフラッシュ。
- **シェア導線は持たない**。SNS シェアは最新 STREAK の SIGNAL カード（[components/SignalCardModal.tsx](components/SignalCardModal.tsx)）に委ねる（過去 1 件の本文シェアは思想に反する）。
- box-shadow は使わない。階層は罫線と余白だけで作る。

### ユーザー identity

YUZU は SNS 機能を持たない（フォロー・他人からの閲覧なし）。よって自己を他人に示すアイコン・名前は不要。**identity は通し番号 `#NNN` のみ**。「名前は無い。お前は #020 だ」。ニックネーム登録／果物絵文字／アバター UI は v2 で全廃止。


### スタッツカード

縦に積み、**ラベルを上・数値を下**にして中央揃え。罫線は `--divider`。

```css
.stat-card {
  background: transparent;
  border: none;
  text-align: center;
  padding: 20px 6px;
  border-top: 1px solid var(--divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.stat-label {                          /* ラベルが先 */
  font-family: var(--font-display);    /* Unbounded */
  font-weight: 700;
  font-size: var(--text-xs);
  letter-spacing: 0.12em;
  color: var(--ink-muted);
  text-transform: uppercase;
}
.stat-value {                          /* 数値は下に大きく */
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-3xl);
  line-height: 1;
  color: var(--ink);
}
```

表示例（横3列）：

```
   DAY      |   RECORDS   |   STREAK
    14       |     42      |     7
```

ラベルは `DAY` / `RECORDS` / `STREAK` の3つ。「DAYS. NO SKIP.」は冗長なため `STREAK` に統一した。

### セクション内フィルタ (`.section-filter`)

セクション見出し右肩に置くトグル。罫線最小・余白で階層を作る YUZU 原則（§5）に従い、**黄色下線**で active を表現する Unbounded タブスタイル。

```
非アクティブ:  color --ink-muted、border-bottom 2px transparent
アクティブ:    color --ink、border-bottom 2px --yuzu-zest
hover:         color --ink
タイポ:        Unbounded 700 / --text-xs / letter-spacing 0.12em / uppercase
padding:      6px 10px
```

**使用箇所**
- LOG > RECORDS の `ALL` / `MARKED`（[components/IndexView.tsx](components/IndexView.tsx)）
- INSIGHT > EMOTION の `MONTH` / `ALL`（[components/EmotionChart.tsx](components/EmotionChart.tsx)）

**他のセクション内トグルを追加する時もこの 1 クラスを使う**（pill 型・セグメントコントロール型は採用しない）。

### MARK / COPY 操作 (`.index-detail-actionbtn`) — v2.2

**INDEX 詳細モーダル内**の本文下に置く操作行（`.index-detail-actions`）。一覧カードからは撤去し、ここに集約した。ダーク背景に馴染む低主張ボタン（ラベル付き）。

**MARK**（PushPin トグル）：
- アイコンは PushPin（ON 塗り）/ PushPinSlash（OFF 線・18px）。タッチターゲット 44px 以上
- 色の差分：OFF=`rgba(255,255,255,.7)` / ON=`--yuzu-zest`（罫線も `--yuzu-zest`）
- `is-marked` 状態のカード（一覧）は `border-top` を `--yuzu-zest` で強調
- 操作直後にラベルが `MARKED.`（Unbounded 700・`--text-xs`）にフラッシュ（0.9s）
- クリック即トグル。モーダルは `detailPost` スナップショットを持つため `marked` はモーダルローカル state で管理
- 編集・削除とは別概念。アイコンは決してゴミ箱・鉛筆を使わない

**COPY** — ⚠️ 一時機能：
- **Notion 移行期間限定**。YUZU 運用が完全移行したら削除する**恒久 UI ではない**。コード上にも `// TEMPORARY: ...` コメント必須
- アイコンは Copy（線・18px）
- クリックで本文（+ `#NNN` + 日時）をクリップボードへコピー
- 操作直後にラベルが `COPIED.`（Unbounded 700・`--text-xs`）にフラッシュ（0.9s）
- MARK と同等の低主張に揃え、恒久 UI として馴染ませすぎない

### ボタン (`.btn`)

すべてのインタラクションは `.btn` をベースに variant で切り分ける。**角丸 4px**、Unbounded 700、`:active` でわずかに縮んで押下感を出す。

| Variant | 用途 | 配色 |
|---|---|---|
| `.btn--primary` | 主要 CTA | `--ink` bg / 白文字 |
| `.btn--secondary` | 副次・キャンセル等 | 透明 bg / `--ink` 枠線・文字、hover で反転 |
| `.btn--accent` | 信号色を使うときだけ（STREAK / 続行系） | `--yuzu-yellow` bg / `--ink` 文字 |
| `.btn--ghost` | パディングのみのテキストボタン | 透明・hover で `--surface-hover` |
| `.btn--danger` | 削除等 | 透明 bg / `#b94343` 枠線 |

サイズ修飾子 `.btn--sm` / `.btn--lg`。

```css
.btn {
  border-radius: 4px;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.08em;
  transition: transform 0.12s var(--ease-soft);
}
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: scale(0.97); transition-duration: 60ms; }  /* 押下感 */
```

Primary は必ず `--ink`（墨）。Accent のみ `--yuzu-yellow` を信号として点灯させる原則を守る。

### アイコンボタン (`.iconbtn`)

44×44px・**常時正円**（border-radius 9999px）・`var(--icon-bg)` の薄ディスクを常時敷く（iOS 26 Liquid Glass 風）。`.iconbtn--lg` で 56px。タッチターゲット 44px を必ず確保。

`.iconbtn--round` は base が常時 round になったため no-op。既存コードの後方互換のため残置。

**インタラクション原則（全 Variant 共通）**
- 通常 — `var(--icon-bg)` の薄ディスク（中立色・墨 6%）を常時表示
- `:hover` — `var(--surface-hover)` の薄黄に切替（浮かせる translateY は使わない）
- `:active` — `scale(0.94)` で押下感。transition-duration は 60ms に短縮

**Variant**（`.btn` と同じ命名）

| クラス | 通常 | ホバー |
|--------|------|--------|
| `--primary` | 墨背景・白アイコン | さらに暗く |
| `--secondary` | 墨枠・墨アイコン | 墨塗りつぶし |
| `--accent` | yuzu-yellow 背景 | zest に変化 |
| `--ghost` | アイコン + `--icon-bg` の薄ディスク | surface-hover 薄黄 |

**用途別ガイド**
- ヘッダー内アイコン（🔔 など）→ `iconbtn iconbtn--ghost`
- ページ戻るリンク → `page-header-back iconbtn iconbtn--ghost`（`<Link>` に付与）
- モーダル内クローズ（黄背景上）→ `.record-modal-close`（白円・専用スタイル、hover で `rgba(255,255,255,0.80)`）
- 投稿の MARK / COPY → INDEX 詳細モーダル内の `.index-detail-actionbtn`（ダーク背景の低主張ボタン。§6 参照）

**廃止クラス**
- `.settings-fab` — 削除済み。`iconbtn iconbtn--ghost` を使うこと。
- `.settings-back` — 削除済み。`page-header-back iconbtn iconbtn--ghost` を使うこと。

### 確認ダイアログ (`.confirm-modal` in [components/DeleteAccountModal.tsx](components/DeleteAccountModal.tsx))

破壊的操作（現状アカウント削除のみ）の確認モーダル。AnimState（`opening→open→closing`）+ `useBodyScrollLock`。

- 構造：`.confirm-modal-scrim`（半透明墨 0.55 の背面。クリックで閉じる）+ `.confirm-modal-panel`（`--surface-card`・`--surface-border` 罫線・`--radius-sharp`・**box-shadow なし**）。中央寄せ。
- **type-to-confirm**：`.confirm-modal-input` に確認語を入力させ、一致するまで実行ボタンを `disabled`。アカウント削除は **`YUZU`**（大文字小文字不問）。1 タップで進めない誤操作防止。
- 実行中（`削除中…`）は scrim クリック・入力・両ボタンを無効化。失敗時はモーダル内 `.confirm-modal-error` に表示（silent fail しない）。
- コピーは Mirror 原則（§4「設定・アカウント削除」参照）。やさしい注意文にしない。

### 感情分析チャート

```
ポジティブ塗り: var(--yuzu-zest)   #E8A020
ネガティブ塗り: var(--mood-low)    #6F84A6  (スレート青、Mirror 原則で「悪」を担わせない)
ライン:        var(--ink) opacity 0.3
ゼロライン:    点線・var(--ink-muted)
背景:          transparent
```

### ワードバブルマップ (`.word-bubble-map` in [components/WordBubbleMap.tsx](components/WordBubbleMap.tsx))

INSIGHT の `WORDS` セクション。全投稿から頻出語 20 語を抽出して頻度に応じたバブルで描画。

```
塗り:           var(--yuzu-yellow)       #F5D84A
ラベル文字:     var(--ink)               #1A1A2E
opacity:        0.3〜1.0（頻度線形マッピング）
配置:           d3-hierarchy.pack（重なりなし）
viewBox:        0 0 320 320（aspect-ratio 1:1）
ラベル最小半径: 18px（それ未満は省略）
```

**インタラクション**

- マウント時：i × 50ms の staggered で `bubbleIn` 480ms（scale 0 → 1）。**初回のみ**。pop/ripple class が外れた時に再発火させない（[components/WordBubbleMap.tsx](components/WordBubbleMap.tsx) の `hasEntered` で制御）
- タップ：自バブルに `bubblePop` 640ms（`1 → 1.20 → 0.95 → 1.06 → 0.99 → 1`、linear ＋ 多段キーフレーム）
- 隣接バブル（距離が `源半径 + 自半径 + 24px` 以内）：`bubbleRipple` 540ms（`1 → 0.96 → 1.04 → 0.99 → 1`）を距離に応じた delay で連動
- `prefers-reduced-motion: reduce` 時は全アニメ無効、opacity のみ維持

### 繰り返しテーマ ランキング (`.theme-card` in [components/RecurringThemes.tsx](components/RecurringThemes.tsx))

INSIGHT の `PATTERN` セクション。Claude が全投稿から抽出した 5 件以下のテーマを **マインドシェア型ランキング** で表示。Spotify Wrapped 風に、各テーマが「あなたの声のうち何%を占めるか」を黄色の横バーで可視化する。

```
レイアウト:        count 降順、share = count / sum(counts) で %算出
順位ラベル:        #1〜#5（11px / --ink-muted / Unbounded）
テーマ名:          15px / 700 / --ink（Unbounded）
                  ※ #1 のみ 18px に拡大
シェア表記:        13px / --ink（Unbounded、"NN%" 右寄せ）
                  ※ #1 のみ 16px
シェアバー:        高さ 4px（#1 のみ 6px）
                  背景 --divider、塗り --yuzu-yellow、border-radius 2px
                  scaleX(0 → 1) で 520ms アニメ
説明文:           14px / line-height 1.6 / --ink-secondary（LINE Seed JP）
カード間隔:        gap 16px（カードボーダーは持たない、罫線はバーが代理）
```

**インタラクション**

- マウント時：`themeIn` 360ms（opacity 0 → 1、translateY 8px → 0）を i × 80ms staggered で発火
- シェアバー：`themeBarIn` 520ms で scaleX 0 → 1（左端から伸びる）
- `prefers-reduced-motion: reduce` 時はアニメ無効

### 時間帯ヒートマップ (`.time-heatmap` in [components/TimeHeatmap.tsx](components/TimeHeatmap.tsx))

INSIGHT の `SIGNAL` セクション。過去 30 日 × 6 バケット（4 時間刻み）= 180 セルの CSS Grid。

```
セル（投稿あり）: var(--yuzu-yellow)  #F5D84A、opacity 0.2〜1.0
セル（投稿なし）: var(--divider)      #EDEAE0
セルサイズ:      10px × 10px、gap 2px、border-radius 2px
時間軸ラベル:    00 / 04 / 08 / 12 / 16 / 20（左、9px、--ink-muted、各バケット先頭時刻）
日付軸ラベル:    7日おき MM/DD（下、9px、--ink-muted）
Tooltip:        黒地・--yuzu-white 文字・10px・Unbounded
                内容: "MM/DD HH:00 / N CHARS"（HH はバケット先頭時刻）
集計境界:        JST 固定（lib/period.ts の jstHour を 4 時間バケットへ丸め / jstDateString）
```

**インタラクション**

- ホバー/フォーカス：セルが scale(1.4) 拡大 + `--ink` の 1px outline + tooltip 表示
- モバイルは横スクロール（`.time-heatmap` が `overflow-x: auto`）

---

## 7. アニメーション原則

| 用途 | 関数 |
|---|---|
| 少しバウンスさせたい | `--ease-organic` |
| なめらかに | `--ease-soft` |
| パッと反応 | `--ease-snap` |

### 維持するアニメーション

- **`float-dot`**（浮遊ドット・待機中）→ 主役モーションとして活かす
- **波形アニメーション**（録音中・音量に反応）→ 主役モーションとして活かす
- **`recording-ring`**（録音中の同心円リング）→ 維持
- **`dot-converge` / `dot-collapse`**（録音／変換時の収束）→ 維持
- **`post-appear`**（投稿出現）→ 維持
- **`fadeIn`** → 維持

### 除外アニメーション

- **`blob-pulse`** → 削除済
- **`ripple`** → 当面維持。将来再評価

### 新規追加


### はなす画面の状態アニメーション

| Phase | アニメーション |
|---|---|
| idle | 浮遊ドット（`float-dot`、3〜7s ランダム） |
| recording | ドットがマイクへ収束（`dot-converge`）+ 同心円リング3重（`recording-ring`）+ 波形 |
| busy | ドットが中心に集まり消える（`dot-collapse`） |
| done | `post-appear` |

`@media (prefers-reduced-motion: reduce)` で全アニメーションを抑制。

---

### セクション見出し (`.mypage-section-title`)

画面内の EMOTION / RECORDS / REPORTS 等のセクション見出し。Unbounded 700・`--text-lg` (18px)・letter-spacing 0.08em・上余白 44px（`padding-top`）。上罫線 `--divider` で区切る。色は `--ink`（墨）。

**ヒエラルキー前提**：ページ名（`.app-header-title`、Unbounded 700・`--text-3xl` 48px）が常に最大。セクション見出しはそれより一段小さく抑え、ページ階層を視覚的に確立する。スタッツラベル（RECORDS / MINUTES / STREAK）は別クラス `.mypage-stat-label` でさらに小さく保つ。

### タブバー (`.tab-bar`) + 録音 FAB (`.fab-record`)

iOS 26 Liquid Glass を参考にした**フローティングピル型**ナビゲーションと、その**右隣に並ぶ録音 FAB**。タブとアクション（録音）を物理的に分離し、タブ pill は遷移、FAB はアクションという責務分離を視覚化する。

```
[ tab-bar 220px ]──12px gap──[ fab-record 64px ]   ＝ 合計 296px をビューポート中央寄せ
       ↑                            ↑
  left: calc(50% - 148px)     left: calc(50% + 84px)
       ↓                            ↓
      LOG / INSIGHT                Microphone（録音）
位置: fixed・bottom: env(safe-area-inset-bottom) + 12px
高さ: 64px（両方同じ）
形状: border-radius: 9999px（完全な楕円・正円）
背景: pill = rgba(250,250,245,0.72) + backdrop-filter blur(40px)、FAB = var(--yuzu-yellow)
縁:   border: 1px solid rgba(255,255,255,0.6)（共通）
影:   box-shadow 0/10/30 rgba(26,26,48,0.10) + inset highlight（共通の Liquid Glass 質感）
```

**タブ構成（2タブ + FAB・順序固定）**

| 順 | 要素 | アイコン | ラベル | 役割 | 情報の出どころ | デフォルト |
|---|------|---------|--------|------|----|----|
| 1 | LOG | ListNumbers | "LOG" | 自分が出した記録（STATS・RECORDS） | ユーザー自身 | ✅ |
| 2 | INSIGHT | FileText | "INSIGHT" | AI 解釈と集計（EMOTION / SIGNAL / WORDS / PATTERN / REPORTS） | AI と集計（他者視点）| |
| — | RECORD FAB | Microphone | （ラベルなし） | 録音アクション。タップで RecordModal を開く | ユーザーの行為 | — |

- 録音 FAB は**タブ state を持たないアクション**（[components/RecordFab.tsx](components/RecordFab.tsx)）。押すと `RecordModal` の fly アニメで開く → CompleteView → 閉じる。
- 内部タブ ID は互換のため `index` / `read` を維持（URL `?tab=read` で INSIGHT へ）。表示ラベルだけ `LOG` / `INSIGHT`。
- アプリ起動時のデフォルト表示は **LOG**。
- 性質分離：LOG = ユーザー自身、INSIGHT = AI 解釈。録音は別 surface（FAB）。旧「HOME」「ME」「PROFILE」「TALK タブ（旧 3 タブ中央）」は廃止。

**アクティブ表現（iOS 26 ライクのスライド pill）**
- 黄色 pill は `.tab-bar::before` で **1 つだけ**描画し、`data-active="index" | "read"` で `translateX` を切り替えてタブ間を滑らせる
- pill 幅 84px・左 13px から開始（pill = 38% / 1 セル 50%、左右 12% インセット相当）
- INSIGHT 時は `translateX(110px)`（1 セル幅ぶん）
- `transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)`（iOS の標準スプリング寄り）
- アイコン・ラベル色も同じカーブで `var(--ink-muted)` ↔ `var(--ink)` に補間
- 旧実装：`.tab-item[aria-selected="true"]::before` で個別描画していたが瞬間切替になるため撤去

**インタラクション**
- `:active` → `scale(0.94)`（タブ・FAB 共通）
- `:hover` → FAB のみ `scale(1.04)`
- `backdrop-filter` 非対応環境では `background: rgba(250,250,245,0.96)` にフォールバック
- `prefers-reduced-motion: reduce` で pill のスライドを無効化（`transition: none`）

**オンボーディング中・モーダル開放中は非表示**（`data-hidden="true"` で opacity 0・translateY 8px・pointer-events none）。タブと FAB は同じ `hidden` プロパティで連動して隠れる。

## 8. レイアウト

レイアウトは **左揃え・グリッド・大胆な余白の不均衡** を基本とし、センター寄せの和的余白は廃止する。スタッツ等の例外は「3. タイポグラフィ／段組ルール」を参照。

### ヘッダー (`.app-header`)

ロゴは置かない。**ページ名 (`.app-header-title`、Unbounded 700・`--text-3xl` 48px・大文字・句点なし)** を左、設定アイコンを右に置くだけのシンプル構成。タブ切替に応じて `LOG` / `INSIGHT` を出し分ける（`app/page.tsx` から `tab` を読んで描画）。これにより、ページ階層がヘッダーの大きな文字で一目で分かる。

```
┌──────────────────────────────┐
│  LOG                     ⚙  │  ← LOG タブ
│  INSIGHT                 ⚙  │  ← INSIGHT タブ
└──────────────────────────────┘
```

オンボーディング（未ログイン）時はページ名・設定アイコン共に非表示。

### 録音 surface（RecordModal）

スタンドアロンの「はなす画面」は持たない。録音は常に **下部ドックの FAB** → **RecordModal の fly アニメ** で開く。タブ間遷移と録音アクションを完全に分離している。

```
[ FAB ] →  fly  →  ┌─────────────────────────────┐
                    │ 長押し。話せ                │  ← idle
                    │                              │
                    │  • • 浮遊するドット • •       │  ← FloatingDots
                    │       🎤 ⤺ 同心円リング       │  ← recording
                    │                              │
                    │ RECORDING. / CARVING.        │
                    └─────────────────────────────┘
```

### タイムライン（LOG タブ内 RECORDS セクション）

矩形カードが縦に並ぶ（旧 歪んだ楕円カードは廃止）。各カードに本文、右上にタイムスタンプ。新規投稿は FAB から飛ばされて先頭に出現する（`post-appear`）。

### ナビゲーション構造（2 タブ + FAB）

```
┌──────────────────────────────┐
│  LOG                     ⚙  │  ← ヘッダー（ページ名 + 設定）
├──────────────────────────────┤
│  LOG:     STATS / RECORDS    │
│  INSIGHT: EMOTION / SIGNAL   │
│  / WORDS / PATTERN / REPORTS │
└──────────────────────────────┘
           ↑ タブコンテンツ
┌──[ LOG ]──[ INSIGHT ]──┐  ┌🎤┐  ← pill タブ + 独立 FAB（横並び）
└────────────────────────┘  └──┘
```

### LOG 画面（自分が出した記録）

ヘッダー左の **`LOG`** が画面見出しを兼ねる。上から下へ「抽象 → 具体」で縦に積む。全セクション左揃え。**PROFILE・INSIGHT は含まない**。

```
┌─────────────────────────────┐
│ LOG                      ⚙ │  ← ヘッダー（ページ名 = 見出し兼任）
├─────────────────────────────┤
│ RECORDS  MINUTES  STREAK     │  ← ① STATS（横3列）
│ 20       128      14         │
├─────────────────────────────┤
│ RECORDS         [ ALL|MARKED ]│  ← ② RECORDS 一覧 + フィルタ
│ ┌─────────────────────────┐ │
│ │ post-card (Raw 矩形)     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘ ← ここで完結
```

- スタッツは **RECORDS / MINUTES / STREAK** の3つ（MINUTES = 総録音分数、声の積み上げ量）。
- `#NNN` は各 RECORD カード上に配置（ヘッダーには出さない）。**ユーザー identity は `#NNN` のみ**。名前・アイコンは持たない。
- RECORDS フィルタは `ALL` / `MARKED` の1組のみ。narrow viewport（<400px）では下段に **折り返す**ことを許容（`flex-wrap: wrap`）。
- 設定アイコンはヘッダー右上に据え置く。

### INSIGHT 画面（AI 解釈）

ヘッダー左の **`INSIGHT`** が画面見出しを兼ねる。「短期 → 長期」「定量 → 解釈」で上から積む。

```
┌──────────────────────────────────┐
│ INSIGHT                       ⚙ │
├──────────────────────────────────┤
│ EMOTION           [ MONTH|ALL ] │  ← ① 感情チャート（折れ線）
│ ╱╲___╱╲                          │
├──────────────────────────────────┤
│ SIGNAL                           │  ← ② 時間帯ヒートマップ
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢│
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢│
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢│
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢│
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢│
│ 04/30  05/07  05/14  05/21       │
├──────────────────────────────────┤
│ WORDS                            │  ← ③ 頻出語バブルマップ
│        ◯ ◯                       │
│       ◯ 何 ◯                    │
│        ◯ ◯                       │
├──────────────────────────────────┤
│ PATTERN                          │  ← ④ Claude 抽出テーマ
│ #1 他人の評価            33%   │
│ ████████░░░░░░░░░░░░░░░░░░░░░░  │
│ 怒られたことを何度も書き残し...   │
│ #2 小さな救い            28%   │
│ ███████░░░░░░░░░░░░░░░░░░░░░░░  │
├──────────────────────────────────┤
│ REPORTS                          │  ← ⑤ 週次/月次レポートカード
│ ┌──[ WEEK #2 ]──┐ ┌──[ #1 ]┐    │
│ └────────────────┘ └────────┘    │
└──────────────────────────────────┘
```

- EMOTION: [components/EmotionChart.tsx](components/EmotionChart.tsx)
- WORDS: [components/WordBubbleMap.tsx](components/WordBubbleMap.tsx)（§6 ワードバブルマップ仕様参照）
- SIGNAL: [components/TimeHeatmap.tsx](components/TimeHeatmap.tsx)（§6 時間帯ヒートマップ仕様参照）
- PATTERN: [components/RecurringThemes.tsx](components/RecurringThemes.tsx)（§6 繰り返しテーマカード仕様参照）
- REPORTS: [components/InsightView.tsx](components/InsightView.tsx) の `mypage-section` 内ブロック。詳細遷移は `/reports`（"MORE →"）。

---

## 9. コピーライティング原則

- **キーボードっぽい言葉を使わない**（「入力」→「話す」、「テキスト」→「声」）
- **自然・果物・育つメタファーは禁止**
- **圧力をかける**（NIKE 寄り。「投稿する」→「話せ」「出せ」）
- **詩的にならない**
- **英日混在を許容**（英＝挑発・状態、日＝事実・本文）

---

## 10. アクセシビリティ

- タッチターゲット最小 44px × 44px（録音 FAB は 64px、RecordModal 内ヒーローのマイクボタンは 140px）
- テキストコントラスト比 4.5:1 以上
- マイクボタンに `aria-label` / `aria-pressed`
- `prefers-reduced-motion` で全アニメ抑制（[globals.css](app/globals.css)）
- iOS Safari 対応（`-webkit-backdrop-filter` 必須）
- `safe-area-inset-bottom` 対応必須

---

## 11. 参照・インスピレーション

- **タイポ**：Swiss International Typographic Style、Helvetica の余白設計
- **トーン**：NIKE のキャンペーン広告、Patta、A-COLD-WALL\*
- **配色**：Off-White の信号色使い、Acne Studios の極端な無彩色＋1色
- **UX**：Twitter の投稿気軽さ × 番号体系のグラフィック（Supreme の連番、Off-White の引用符）

---

## 12. メンテナンス（自動チェック）

このドキュメントは **デザインに変更があれば必ず追従更新する**。色・シェイプ・コンポーネント・コピー・アニメーションのいずれかを変えたら、コードと同じコミット（または直後）で該当セクションを更新すること。

### 自動チェック

`npm run design:check` で以下を検証する（CI: [.github/workflows/design-check.yml](.github/workflows/design-check.yml)）:

1. **`design:lint`** — Google Labs [design.md](https://github.com/google-labs-code/design.md) CLI でフロントマターの構造・参照・WCAGコントラストを検証
2. **`design:drift`** — このファイル冒頭 `cssVars:` と [app/globals.css](app/globals.css) の `:root` を双方向突合。値の不一致・未実装・未文書化トークンを検出（[scripts/check-design-drift.mjs](scripts/check-design-drift.mjs)）

### トークン更新の手順

1. [app/globals.css](app/globals.css) の `:root` で CSS 変数を変更
2. このファイル冒頭 `cssVars:` の同名キーも同じ値に更新
3. 必要なら本文セクション（カラーパレット・シェイプなど）の説明・サンプルも更新
4. `npm run design:check` がパスすることを確認

### デザインプレビュー（実体）

実物プレビューは [public/design-preview.html](public/design-preview.html)。`http://localhost:3000/design-preview.html` で確認できる。**プレビュー HTML を編集したら、この DESIGN.md と `app/globals.css` / `components/*.tsx` を必ず同期する** こと（プレビューが source-of-truth）。


---

## 13. 用語集（Glossary）

YUZU の世界観・UI で用いる用語の定義表。新規コピーや UI を書くときは必ずここに揃える。NGワード（§4）と矛盾しないこと。

| 用語 | 読み/表記 | 定義 | UI上の扱い・NG言い換え |
|---|---|---|---|
| LOG | ログ | **ユーザー自身が出した**記録の集約面（STATS・RECORDS）。デフォルトタブ。 | INSIGHT・PROFILE は含まない。旧称「INDEX」 |
| INSIGHT | インサイト | **AI と集計** がユーザーの声を解釈して返す面（EMOTION / SIGNAL / WORDS / PATTERN / REPORTS）。 | LOG とは情報の出どころが違うため分離。旧称「READ」「REPORT」 |
| RECORD FAB | レコード FAB | 録音アクション。タブバー右に常時並ぶ正円ボタン。タブ state を持たない。 | 旧「TALK タブ」は廃止 |
| `#NNN` | ナンバー | ユーザーの **identity 兼通し番号**。名前・アイコンの代替。 | 「名前は無い。お前は #020 だ」。ゼロ埋め3桁。LOG の各 RECORD カード上に表示 |
| RECORD | レコード | 1件の声の記録（単数）。声が変換され刻まれたもの。 | 「投稿」「日記」「テキスト」と呼ばない |
| RECORDS | レコーズ | RECORD の一覧（複数）。INDEX 内のセクション名でもある。 | スタッツラベルにも使用 |
| SIGNAL | シグナル | 声を出した瞬間に生じる信号（世界観語）。INSIGHT では時間帯ヒートマップのセクション名。 | PRD §2 THE RECORD 由来 |
| WORDS | ワーズ | INSIGHT サブセクション。全投稿の頻出語バブルマップ。 | 「キーワード」「タグ」と呼ばない |
| PATTERN | パターン | INSIGHT サブセクション。Claude が抽出した繰り返しテーマのマインドシェア型ランキング。 | 「テーマ」「トピック」と呼ばない |
| MARK | マーク | 自分の RECORD に刻印を打つ唯一の能動操作。常時トグルボタン（v2）。 | 「お気に入り」「いいね」「ブックマーク」と呼ばない |
| MARKED（フィルタ） | マークド | MARK 済み RECORD のみを抽出するフィルタ。`ALL` と対になる。 | RECORDS のフィルタとして実装。独立タブにしない |
| COPY | コピー | 本文（+ `#NNN` + 日時）をクリップボードへコピーする **一時機能**。Notion 保存用。 | ⚠️ 将来削除予定。コード上に `// TEMPORARY:` コメント必須 |
| STATS | スタッツ | LOG 上部の数値群 **RECORDS / MINUTES / STREAK**。 | §6 スタッツカード準拠。DAY は INDEX 詳細モーダル側 |
| MINUTES | ミニッツ | 総録音分数。声の積み上げ量を示す。 | STATS の中央。旧「SINCE（登録日数）」を置換 |
| DAY | デイ | 登録からの日数。`DAY ○`。INDEX 詳細モーダルの STATS。 | |
| STREAK | ストリーク | 連続投稿日数。 | 「DAYS. NO SKIP.」は冗長のため不使用 |
| SILENCE | サイレンス | 録音がなかった日に刻まれる印（`SILENCE.`）。 | 沈黙も記録の一部として扱う |
| EMOTION | エモーション | 声の感情推移を示す折れ線チャート（INSIGHT 先頭）。 | 「気づき」「自分を知ろう」と書かない。旧称「SENTIMENT」 |
| CARVING. / CARVED. | カービング | 声をテキストに変換中（`CARVING.`）/ 変換完了・未保存（`CARVED.`、オンボ）。 | 旧称「DECODING.」「DECODED.」。「変換中」「処理中」と書かない |
| LOG/INSIGHT 2タブ + RECORD FAB | — | 最終ナビ構成。性質分離（LOG=ユーザー / INSIGHT=AI / FAB=アクション）の結果。 | ホーム・ME・PROFILE・TALK タブは廃止済み |

**v2 で廃止された用語/概念**: `PROFILE`（INDEX セクション廃止）、ニックネーム / 果物絵文字アイコン / `AvatarMark`（identity は `#NNN` のみに統一）。

> NGワード（§4 再掲）：「癒し」「寄り添う」「頑張ろう」「育つ」「林」「種」「香り」「果実」「やさしく」「ふんわり」「あなたらしく」「入力」「テキスト」「記録する（→話す に統一）」「気づき」「自分を知ろう」。用語集・UIコピーにこれらが混入していないことを確認すること。
