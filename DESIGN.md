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

- **英語＝Unbounded＝挑発・状態**：`RECORDING.` / `DECODING.` / `RECORDED.` / `DAY` / `RECORDS` / `STREAK`
- **日本語＝LINE Seed JP＝事実・本文・プロンプト**：プロンプト10種・エラー・タグライン・本文UI

### muute との対比

| 軸 | muute | YUZU |
|---|---|---|
| 動詞 | 寄り添う・気づく | 話せ・出せ |
| 主語 | あなた | YOU（記号化） |
| 文末 | 〜ですね、〜しよう | 〜だ。〜しろ。 |
| 装飾 | やわらかい絵文字 | 句点（.）終わり |
| 比喩 | 自然・植物・育つ | 信号・記録・刻印 |

ビジュアル軸でも同様。muute（パステル・水彩・キャラクター）／ Awarefy（ブルー・医療的・グラフ）に対し、YUZU は **単色オフホワイト + 信号黄 + 黒・グリッド・タイポ駆動**。参照群はジャーナリングアプリではなく、Swiss / NIKE / Patta / A-COLD-WALL\* / Off-White / Acne Studios。

### NGワード

```
「癒し」「寄り添う」「頑張ろう」     → muute っぽい
「育つ」「林」「種」「香り」「果実」 → YUZU の世界観に反する
「やさしく」「ふんわり」「あなたらしく」→ ミニマルに反する
「入力」「テキスト」「記録する」      → ツールっぽい（「話す」に統一）
「気づき」「自分を知ろう」           → 意識高い系
```

### UIコピー

| 場所 | コピー |
|---|---|
| 待機（マイクボタン下） | 長押し。話せ |
| 録音中 | RECORDING. |
| 変換中 | DECODING. |
| 投稿完了 | RECORDED. |
| タイムライン空 | 最初の一声を / はじまりを、語って / ここから始まる（ランダム） |
| 投稿数 | ○ RECORDS |
| 連続日数 | STREAK |
| 登録日数 | DAY ○ |
| 音声なし | 無音、話せ |
| 短すぎ | 短い、話せ |
| 沈黙の刻印（録音なし日） | SILENCE. |
| 完了画面 画像書き出し | 画像で晒す |
| MARK 操作直後 | MARKED. |
| COPY 操作直後 | COPIED. |
| RECORDS フィルタ（全件） | ALL |
| RECORDS フィルタ（刻印のみ） | PINNED |
| PINNED 空表示 | MARK されたものは無い。 |
| INDEX 通し番号（identity 兼） | `#NNN`（ゼロ埋め3桁） |

### 投稿促進プロンプト（B案）

マイクボタン上にランダム表示。毎セッションで変わる。

```javascript
const prompts = [
  '何が本当だ？',
  '言ってないことは？',
  '今日、誰に嘘をついた？',
  '本当はどう思った？',
  '逃げてることは？',
  '怒ってるのは何にだ？',
  '誰にも言えないことを。',
  '整えるな。話せ。',
  '1分でいい。出せ。',
  '黙ってる場合か？',
];
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
│ たった今         #020      [📌] [⧉]  │ ← 1行ヘッダー
│ 最高、とは言わないけど、悪くない。     │ ← 本文（主役）
└──────────────────────────────────────┘
```

- アイコン・名前は **持たない**（identity は `#NNN` のみ）
- 1行ヘッダー: タイムスタンプ（Unbounded 400 / `--ink-muted`）+ `#NNN`（Unbounded / `--ink-muted`）+ 右端に MARK / COPY の小ボタン
- 本文は LINE Seed JP（`--ink`）。主役。
- 角丸は `--radius-sharp`（2px）。`border-top: 1px solid var(--divider)`。MARK 済みは `border-top-color: var(--yuzu-zest)`。
- blob 形状・ホバー時モーフィング・box-shadow は使わない。

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

### RECORDS フィルタ (`.records-filter`)

INDEX 内 `RECORDS` セクション右肩のトグル。`ALL` / `PINNED` の2択のみ。Unbounded 700・letter-spacing 0.12em・色は非アクティブ `--ink-muted` / アクティブ `--ink` + 下罫線 `--yuzu-zest`。**他のフィルタは追加しない**（削ぎ落としの原則）。

### MARK アイコン (`.post-iconbtn.post-mark-btn`) — v2

各 RECORD カード右端に配置する常時トグル。アイコンは PushPin（ON 塗り）/ PushPinSlash（OFF 線）。

- タッチターゲット 44px 以上、見た目アイコンは 16px・低主張
- **背景・ボーダー無し**（v1 の黄色枠は撤廃）。色の差分のみ：OFF=`--ink-muted` / ON=`--yuzu-zest`
- `is-marked` 状態のカードは `border-top` を `--yuzu-zest` で強調
- 操作直後に `MARKED.`（Unbounded 700・`--text-xs`・`--yuzu-zest`）が右下に 0.9s フラッシュ
- クリック即トグル（v1 の長押し検出は廃止）
- 編集・削除とは別概念。アイコンは決してゴミ箱・鉛筆を使わない

### COPY アイコン (`.post-iconbtn.post-copy-btn`) — ⚠️ 一時機能

**Notion 移行期間限定**。YUZU 運用が完全移行したら削除する**恒久 UI ではない**。コード上にも `// TEMPORARY: ...` コメント必須。

- アイコンは Copy（線・16px・`--ink-muted`）
- クリックで本文（+ `#NNN` + 日時）をクリップボードへコピー
- 操作直後に `COPIED.`（Unbounded 700・`--text-xs`・`--ink`）が右下に 0.9s フラッシュ
- 視覚的に MARK と同等の低主張に揃え、恒久 UI として馴染ませすぎない

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

44×44px・角丸 4px がデフォルト。`.iconbtn--round` で正円、`.iconbtn--lg` で 56px。タッチターゲット 44px を必ず確保。

**インタラクション原則（全 Variant 共通）**
- `:hover` — `var(--surface-hover)` の薄背景を塗る（浮かせる translateY は使わない）
- `:active` — `scale(0.94)` で押下感。transition-duration は 60ms に短縮

**Variant**（`.btn` と同じ命名）

| クラス | 通常 | ホバー |
|--------|------|--------|
| `--primary` | 墨背景・白アイコン | さらに暗く |
| `--secondary` | 墨枠・墨アイコン | 墨塗りつぶし |
| `--accent` | yuzu-yellow 背景 | zest に変化 |
| `--ghost` | アイコンのみ（背景なし） | surface-hover 薄背景 |

**用途別ガイド**
- ヘッダー内アイコン（🔔 など）→ `iconbtn iconbtn--ghost`
- ページ戻るリンク → `page-header-back iconbtn iconbtn--ghost`（`<Link>` に付与）
- モーダル内クローズ（黄背景上）→ `.record-modal-close`（白円・専用スタイル、hover で `rgba(255,255,255,0.80)`）
- 投稿コピー → `.post-copy-btn`（専用の小型バリアント 28px、同様パターン）

**廃止クラス**
- `.settings-fab` — 削除済み。`iconbtn iconbtn--ghost` を使うこと。
- `.settings-back` — 削除済み。`page-header-back iconbtn iconbtn--ghost` を使うこと。

### 感情分析チャート

```
ポジティブライン: var(--yuzu-zest)   #E8A020
ネガティブライン: var(--ink)         #1A1A2E
ゼロライン:      点線・var(--ink-muted)
背景:           transparent
```

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

画面内の SENTIMENT / RECORDS / REPORTS 等のセクション見出し。Unbounded 700・`--text-lg` (18px)・letter-spacing 0.08em・上余白 44px（`padding-top`）。上罫線 `--divider` で区切る。色は `--ink`（墨）。

**ヒエラルキー前提**：ページ名（`.app-header-title`、Unbounded 700・`--text-3xl` 48px）が常に最大。セクション見出しはそれより一段小さく抑え、ページ階層を視覚的に確立する。スタッツラベル（RECORDS / SINCE / STREAK）は別クラス `.mypage-stat-label` でさらに小さく保つ。

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
| 2 | INSIGHT | FileText | "INSIGHT" | AI 解釈（SENTIMENT・REPORTS） | AI（他者視点）| |
| — | RECORD FAB | Microphone | （ラベルなし） | 録音アクション。タップで RecordModal を開く | ユーザーの行為 | — |

- 録音 FAB は**タブ state を持たないアクション**（[components/RecordFab.tsx](components/RecordFab.tsx)）。押すと `RecordModal` の fly アニメで開く → CompleteView → 閉じる。
- 内部タブ ID は互換のため `index` / `read` を維持（URL `?tab=read` で INSIGHT へ）。表示ラベルだけ `LOG` / `INSIGHT`。
- アプリ起動時のデフォルト表示は **LOG**。
- 性質分離：LOG = ユーザー自身、INSIGHT = AI 解釈。録音は別 surface（FAB）。旧「HOME」「ME」「PROFILE」「TALK タブ（旧 3 タブ中央）」は廃止。

**アクティブ表現**
- `aria-selected="true"` のタブに `::before` で `--yuzu-yellow` の丸チップを置く（`inset: 6px 12%`・`border-radius: 9999px`）
- アイコン・ラベルは `var(--ink)` に変化（非アクティブは `var(--ink-muted)`）

**インタラクション**
- `:active` → `scale(0.94)`（タブ・FAB 共通）
- `:hover` → FAB のみ `scale(1.04)`
- タブ切替はフェードなし即時
- `backdrop-filter` 非対応環境では `background: rgba(250,250,245,0.96)` にフォールバック

**オンボーディング中・モーダル開放中は非表示**（`data-hidden="true"` で opacity 0・translateY 8px・pointer-events none）。タブと FAB は同じ `hidden` プロパティで連動して隠れる。

## 8. レイアウト

レイアウトは **左揃え・グリッド・大胆な余白の不均衡** を基本とし、センター寄せの和的余白は廃止する。スタッツ等の例外は「3. タイポグラフィ／段組ルール」を参照。

### ヘッダー (`.app-header`)

ロゴは置かない。**ページ名 (`.app-header-title`、Unbounded 700・`--text-3xl` 48px・大文字 + 末尾ピリオド)** を左、設定アイコンを右に置くだけのシンプル構成。タブ切替に応じて `LOG.` / `INSIGHT.` を出し分ける（`app/page.tsx` から `tab` を読んで描画）。これにより、ページ階層がヘッダーの大きな文字で一目で分かる。

```
┌──────────────────────────────┐
│  LOG.                    ⚙  │  ← LOG タブ
│  INSIGHT.                ⚙  │  ← INSIGHT タブ
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
                    │ RECORDING. / DECODING.       │
                    └─────────────────────────────┘
```

### タイムライン（LOG タブ内 RECORDS セクション）

矩形カードが縦に並ぶ（旧 歪んだ楕円カードは廃止）。各カードに本文、右上にタイムスタンプ。新規投稿は FAB から飛ばされて先頭に出現する（`post-appear`）。

### ナビゲーション構造（2 タブ + FAB）

```
┌──────────────────────────────┐
│  LOG.                    ⚙  │  ← ヘッダー（ページ名 + 設定）
├──────────────────────────────┤
│  LOG:     STATS / RECORDS    │
│  INSIGHT: SENTIMENT / REPORTS│
└──────────────────────────────┘
           ↑ タブコンテンツ
┌──[ LOG ]──[ INSIGHT ]──┐  ┌🎤┐  ← pill タブ + 独立 FAB（横並び）
└────────────────────────┘  └──┘
```

### LOG 画面（自分が出した記録）

ヘッダー左の **`LOG.`** が画面見出しを兼ねる。上から下へ「抽象 → 具体」で縦に積む。全セクション左揃え。**PROFILE・INSIGHT は含まない**。

```
┌─────────────────────────────┐
│ LOG.                     ⚙ │  ← ヘッダー（ページ名 = 見出し兼任）
├─────────────────────────────┤
│ RECORDS  SINCE  STREAK       │  ← ① STATS（横3列）
│ 20       5/14    14          │
├─────────────────────────────┤
│ RECORDS         [ ALL|PINNED ]│  ← ② RECORDS 一覧 + フィルタ
│ ┌─────────────────────────┐ │
│ │ post-card (Raw 矩形)     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘ ← ここで完結
```

- スタッツは **RECORDS / SINCE / STREAK** の3つ。
- `#NNN` は各 RECORD カード上に配置（ヘッダーには出さない）。**ユーザー identity は `#NNN` のみ**。名前・アイコンは持たない。
- RECORDS フィルタは `ALL` / `PINNED` の1組のみ。narrow viewport（<400px）では下段に **折り返す**ことを許容（`flex-wrap: wrap`）。
- 設定アイコンはヘッダー右上に据え置く。

### INSIGHT 画面（AI 解釈）

ヘッダー左の **`INSIGHT.`** が画面見出しを兼ねる。

```
┌─────────────────────────────┐
│ INSIGHT.                 ⚙ │
├─────────────────────────────┤
│ SENTIMENT      [ MONTH|ALL ] │  ← ① 感情チャート
│ ╱╲___╱╲                      │
├─────────────────────────────┤
│ REPORTS                      │  ← ② 週次/月次レポートカード
│ ┌──[ WEEK #2 ]──┐ ┌──[ #1 ]┐│
│ └────────────────┘ └────────┘│
└─────────────────────────────┘
```

- SENTIMENT: [components/LongSentimentChart.tsx](components/LongSentimentChart.tsx)
- REPORTS: [components/ReadView.tsx](components/ReadView.tsx) の `mypage-section` 内ブロック。詳細遷移は `/reports`（"MORE →"）。

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
| INSIGHT | インサイト | **AI** がユーザーの声を解釈して返す面（SENTIMENT・REPORTS）。 | LOG とは情報の出どころが違うため分離。旧称「READ」「REPORT」 |
| RECORD FAB | レコード FAB | 録音アクション。タブバー右に常時並ぶ正円ボタン。タブ state を持たない。 | 旧「TALK タブ」は廃止 |
| `#NNN` | ナンバー | ユーザーの **identity 兼通し番号**。名前・アイコンの代替。 | 「名前は無い。お前は #020 だ」。ゼロ埋め3桁。LOG の各 RECORD カード上に表示 |
| RECORD | レコード | 1件の声の記録（単数）。声が変換され刻まれたもの。 | 「投稿」「日記」「テキスト」と呼ばない |
| RECORDS | レコーズ | RECORD の一覧（複数）。INDEX 内のセクション名でもある。 | スタッツラベルにも使用 |
| SIGNAL | シグナル | 声を出した瞬間に生じる信号。RECORD の前段概念（世界観語）。 | PRD §2 THE RECORD 由来 |
| MARK | マーク | 自分の RECORD に刻印を打つ唯一の能動操作。常時トグルボタン（v2）。 | 「お気に入り」「いいね」「ブックマーク」と呼ばない |
| PINNED | ピンド | MARK 済み RECORD のみを抽出したビュー/フィルタ。 | RECORDS のフィルタとして実装。独立タブにしない |
| COPY | コピー | 本文（+ `#NNN` + 日時）をクリップボードへコピーする **一時機能**。Notion 保存用。 | ⚠️ 将来削除予定。コード上に `// TEMPORARY:` コメント必須 |
| STATS | スタッツ | DAY / RECORDS / STREAK の数値群。 | §6 スタッツカード準拠 |
| DAY | デイ | 登録からの日数。`DAY ○`。 | |
| STREAK | ストリーク | 連続投稿日数。 | 「DAYS. NO SKIP.」は冗長のため不使用 |
| SENTIMENT | センチメント | 声の感情推移を示す折れ線チャート。 | 「気づき」「自分を知ろう」と書かない |
| LOG/INSIGHT 2タブ + RECORD FAB | — | 最終ナビ構成。性質分離（LOG=ユーザー / INSIGHT=AI / FAB=アクション）の結果。 | ホーム・ME・PROFILE・TALK タブは廃止済み |

**v2 で廃止された用語/概念**: `PROFILE`（INDEX セクション廃止）、ニックネーム / 果物絵文字アイコン / `AvatarMark`（identity は `#NNN` のみに統一）。

> NGワード（§4 再掲）：「癒し」「寄り添う」「頑張ろう」「育つ」「林」「種」「香り」「果実」「やさしく」「ふんわり」「あなたらしく」「入力」「テキスト」「記録する（→話す に統一）」「気づき」「自分を知ろう」。用語集・UIコピーにこれらが混入していないことを確認すること。
