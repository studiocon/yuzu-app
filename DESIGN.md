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
| 待機（マイクボタン下） | 長押し。話して |
| 録音中 | RECORDING. |
| 変換中 | DECODING. |
| 投稿完了 | RECORDED. |
| タイムライン空 | 最初の一声を / はじまりを、語って / ここから始まる（ランダム） |
| ニックネーム未設定 | 名前をつけよう |
| 投稿数 | ○ RECORDS |
| 連続日数 | STREAK |
| 登録日数 | DAY ○ |
| 音声なし | 声が聞こえなかった。もう一度。 |
| 短すぎ | 短い。もう一度。 |

### 投稿促進プロンプト（B案）

マイクボタン上にランダム表示。毎セッションで変わる。

```javascript
const prompts = [
  '長押し。話して',
  '何が本当なのか？',
  '言ってないことは？',
  '今日、何があった？',
  '本当はどう思ってる？',
  '何から逃げてる？',
  '何に怒ってる？',
  '誰にも言えないことを',
  '整えるな。話して',
  '1分でいい。出して',
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

### 投稿カード (`.post-card`)

- `background: var(--yuzu-white)`（または白）+ `border-top: 1px solid var(--ink-muted)`（罫線で区切るスイス的手法）
- 右上にタイムスタンプ（Unbounded 400 / `--ink-muted`）
- 本文は LINE Seed JP（`--ink`）
- 角丸は `--radius-sharp`（2px）
- blob 形状・ホバー時モーフィングは使わない

### ユーザー絵文字（果物アバター）

MVP では現行の果物プールを維持（既存資産の互換）：

```
🍑 🍋 🍇 🥝 🍓 🫐 🍈 🍊 🍍 🥭 🍌 🍒 🍎 🍐 🫒
```


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

44×44px・角丸 4px がデフォルト。`.iconbtn--round` で正円、`.iconbtn--lg` で 56px。タッチターゲット 44px を必ず確保。`:active` は `scale(0.94)` で少し強めの押下感。Variant は `.btn` と同じ命名（`--primary` / `--secondary` / `--accent` / `--ghost`）。

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

マイページの SENTIMENT / RECORDS 等のセクション見出し。Unbounded 700・40px・letter-spacing 0.04em・上余白 44px（`padding-top`）。上罫線 `--divider` で区切る。色は `--ink`（墨）でダイナミックに。スタッツラベル（DAY / RECORDS / STREAK）は別クラス `.mypage-stat-label` で小さく保つ。

## 8. レイアウト

レイアウトは **左揃え・グリッド・大胆な余白の不均衡** を基本とし、センター寄せの和的余白は廃止する。スタッツ等の例外は「3. タイポグラフィ／段組ルール」を参照。

### はなす画面（デフォルト）

```
┌─────────────────────────────┐
│ YUZU                         │  ← ヘッダー（左揃え・Unbounded 900）
│ 本物でいろ                  │  ← タグライン（LINE Seed JP）
├─────────────────────────────┤
│ 長押し。話して               │  ← idle（左揃え）
│                              │
│   • • 浮遊するドット • •      │  ← FloatingDots（idle/recording/busy で挙動変化）
│         🎤 ⤺ 同心円リング      │  ← recording
│                              │
│ RECORDING. / DECODING.       │  ← 録音中・変換中（Unbounded 700）
└─────────────────────────────┘
```

### タイムライン画面

矩形カードが縦に並ぶ（旧 歪んだ楕円カードは廃止）。各カードに本文、右上にタイムスタンプ。新規投稿はマイクボタンから飛ばされて先頭に出現する（`post-appear`）。

### マイページ画面

- ヘッダー：ニックネーム（LINE Seed JP 700）＋ `DAY ○`（Unbounded 700）
- スタッツ：左揃え・罫線で区切り・数値は巨大・ラベルは小さく
- 感情分析チャート：transparent 背景・墨とゆずオレンジの2線
- 投稿一覧（マイ）：タイムラインと同レイアウト

---

## 9. コピーライティング原則

- **キーボードっぽい言葉を使わない**（「入力」→「話す」、「テキスト」→「声」）
- **自然・果物・育つメタファーは禁止**
- **圧力をかける**（NIKE 寄り。「投稿する」→「話せ」「出せ」）
- **詩的にならない**
- **英日混在を許容**（英＝挑発・状態、日＝事実・本文）

---

## 10. アクセシビリティ

- タッチターゲット最小 44px × 44px（マイクボタンは 140px）
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

