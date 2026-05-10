<!--
  YAML frontmatter: design tokens のソースオブトゥルース。
  CI が `scripts/check-design-drift.mjs` で `app/globals.css` の :root と突合する。
  値を変えるときは CSS と frontmatter の両方を更新すること。
-->
---
name: YUZU
tagline: 生の声が、香る。
typography:
  display: Unbounded
  body: Noto Sans JP
cssVars:
  # YUZU Primary
  --yuzu-yellow:      "#F5D84A"
  --yuzu-zest:        "#E8A020"
  --yuzu-white:       "#FAFAF5"
  # YUZU Accent
  --yuzu-green:       "#2D5016"
  --yuzu-green-light: "#8DBF8D"
  --yuzu-cream:       "#FFF8E7"
  # Text
  --ink:              "#1A1A2E"
  --ink-secondary:    "#4A4A6A"
  --ink-muted:        "#9A9ABA"
  # Surface
  --surface-card:     "#FFFEF5"
  --surface-border:   "#E8E0C8"
  --surface-hover:    "#FFF5CC"
  # Legacy aliases
  --tangerine:      "var(--yuzu-zest)"
  --candy-pink:     "var(--yuzu-zest)"
  --bubblegum:      "var(--yuzu-yellow)"
  --peach-mist:     "var(--yuzu-cream)"
  --text-primary:   "var(--ink)"
  --text-secondary: "var(--ink-secondary)"
  --text-muted:     "var(--ink-muted)"
  # Blob shapes — strong (mic button)
  --blob-1: "60% 40% 55% 45% / 45% 55% 40% 60%"
  --blob-2: "45% 55% 60% 40% / 60% 40% 55% 45%"
  --blob-3: "40% 60% 45% 55% / 55% 45% 60% 40%"
  --blob-4: "55% 45% 40% 60% / 40% 60% 45% 55%"
  # Blob shapes — soft (cards: natural ellipse)
  --blob-soft-1: "48% 52% 42% 58% / 49% 64% 36% 51%"
  --blob-soft-2: "52% 48% 58% 42% / 56% 44% 62% 38%"
  --blob-soft-3: "44% 56% 46% 54% / 42% 58% 44% 56%"
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

> 生の声が、香る。

---

## 1. デザインコンセプト

### 世界観

**「香りのような声」**

整理されていない、もやもやした思考こそが価値。YUZU はその「ナマのまま」を受け取る。きれいじゃなくていい。整っていないことが正しい。あなたの声は香りになって、誰かに届く。

### キーワード

- **生っぽさ** → 加工しない、整えない
- **やわらかさ** → 角を立てない、ゆるく存在する
- **つながり** → 点ではなく、線と面で繋がる
- **香り** → 声が香りのように広がる有機的なグロース

---

## 2. カラーパレット

CSS変数として [app/globals.css](app/globals.css) の `:root` に定義。世界観は「ゆず黄・深緑」のナチュラルパレット。

```css
/* YUZU Primary */
--yuzu-yellow: #F5D84A;   /* ゆず黄：メインカラー・マイクボタン通常時 */
--yuzu-zest:   #E8A020;   /* 完熟オレンジ黄：CTA・録音中・タブ中央 */
--yuzu-white:  #FAFAF5;   /* 果肉の白：背景 */

/* YUZU Accent */
--yuzu-green:       #2D5016;  /* 深緑：葉・アクセント */
--yuzu-green-light: #8DBF8D;  /* ライトグリーン */
--yuzu-cream:       #FFF8E7;  /* クリーム：カード背景・絵文字バッジ */

/* Text */
--ink:           #1A1A2E;  /* 墨：メインテキスト */
--ink-secondary: #4A4A6A;  /* サブテキスト */
--ink-muted:     #9A9ABA;  /* ミュート：タイムスタンプ */

/* Surface */
--surface-card:   #FFFEF5;  /* カード背景 */
--surface-border: #E8E0C8;  /* ボーダー */
--surface-hover:  #FFF5CC;  /* ホバー */
```

背景は `body` に固定の斜めグラデーション（クリームイエロー → ホワイト → ライムホワイト → ミントホワイト）を敷いて、ゆず畑の空気感を持たせる。

---

## 3. タイポグラフィ

- 英字・ロゴ・タブラベル・ボタン: **Unbounded** (`--font-display`、`font-weight: 700` 基本、ロゴは `900`)
- 日本語本文・コピー・タイムスタンプ: **Noto Sans JP** (`--font-body`)

`next/font/google` 経由で [app/layout.tsx](app/layout.tsx) で読み込み、CSS変数として配信。`.font-display` クラスで Unbounded を強制適用できる。

サイズスケール: `--text-xs` (11) / `sm` (13) / `base` (15) / `lg` (18) / `xl` (24) / `2xl` (32) / `3xl` (48)。

---

## 4. フォームとシェイプ

### 歪んだ楕円（シグネチャーシェイプ）

YUZU の最も特徴的なビジュアル要素。「もやもやした思考」を視覚化する。

**強い blob（マイクボタン用）** — 大胆に歪ませる:

```css
--blob-1: 60% 40% 55% 45% / 45% 55% 40% 60%;   /* 静止 */
--blob-2: 45% 55% 60% 40% / 60% 40% 55% 45%;   /* ホバー */
--blob-3: 40% 60% 45% 55% / 55% 45% 60% 40%;   /* 録音中 */
--blob-4: 55% 45% 40% 60% / 40% 60% 45% 55%;   /* アニメ用 */
```

**やわらかい blob（投稿カード用）** — ほぼ角丸長方形だが微妙にゆらぐ:

```css
--blob-soft-1: 48% 52% 42% 58% / 49% 64% 36% 51%;
--blob-soft-2: 52% 48% 58% 42% / 56% 44% 62% 38%;
--blob-soft-3: 44% 56% 46% 54% / 42% 58% 44% 56%;
```

---

## 5. コンポーネント

### マイクボタン (`.mic-button` in [globals.css](app/globals.css))

| 状態 | 外観 |
|---|---|
| デフォルト | `--yuzu-yellow` 背景 + 🎤 + ゆず黄のグロー |
| ホバー | わずかに拡大 + blob-2 へモーフ + 影が広がる |
| 録音中 (recording) | `--yuzu-zest` + blob-pulse + オレンジ黄の波紋 |
| 変換中 (busy) | `--yuzu-cream` + 🌱 |

### 投稿カード (`.post-card`)

- `background: var(--surface-card)` + `border: 1.5px solid var(--surface-border)`
- 中身（絵文字バッジ・テキスト）がはみ出さない控えめな歪み
- 左に絵文字バッジ（投稿者の果物・クリーム背景）
- 新規投稿は `post-appear` でふわっと出現

### ユーザー絵文字（果物アバター）

果物プール:

```
🍑 🍋 🍇 🥝 🍓 🫐 🍈 🍊 🍍 🥭 🍌 🍒 🍎 🍐 🫒
```

- ゲスト: 初回アクセス時にランダム割り当てを localStorage (`yuzu-emoji`) に保存
- 登録ユーザー (V2): 登録時に選択・変更可能

---

## 6. アニメーション原則

| 用途 | 関数 |
|---|---|
| 少しバウンスさせたい | `--ease-organic` |
| なめらかに | `--ease-soft` |
| パッと反応 | `--ease-snap` |

主な keyframes: `blob-pulse`, `ripple`, `recording-ring`, `post-appear`, `float-dot`, `dot-converge`, `dot-collapse`, `fadeIn`。

### はなす画面の状態アニメーション

| Phase | アニメーション |
|---|---|
| idle | 浮遊ドット（`float-dot`、3〜7s ランダム） |
| recording | ドットがマイクへ収束（`dot-converge`）+ 同心円リング3重（`recording-ring`） |
| busy | ドットが中心に集まり消える（`dot-collapse`） |

`@media (prefers-reduced-motion: reduce)` で全アニメーションを抑制。

---

## 7. レイアウト

3タブ構成。デフォルトは「はなす」。タブバーは画面下に浮かぶ Liquid Glass 風（半透明 + `backdrop-filter: blur(20px)`）で、スクロール中はラベルが消えてアイコンのみに縮小する。ヘッダーは `scrollY > 50` でフェードアウトし、コンテンツへの圧迫感を減らす。

### はなす画面（デフォルト）

```
┌─────────────────────────────┐
│  🍋 YUZU                     │  ← ヘッダー（スクロールで隠れる）
│  生の声が、香る。             │
├─────────────────────────────┤
│  長押しして、話す             │  ← idle のみ（画面上 1/3）
│                              │
│   • • 浮遊するドット • •      │  ← FloatingDots（待機/録音/変換で挙動が変わる）
│         🎤 ⤺ 同心円リング      │  ← 録音中
│                              │
│  聴いてるよ… / 言葉にしてるよ…│  ← 録音中・変換中のみ
├─────────────────────────────┤
│      [💬]   ( 🎤 )   [👤]      │  ← Liquid Glass タブバー
└─────────────────────────────┘
```

### タイムライン画面

歪んだ楕円のカードが縦に並ぶ。新規投稿はマイクボタンから飛ばされて先頭にふわっと出現する。

### マイページ画面

現状はプレースホルダー。

```
🌱 わたしの畑
🌱 みんなのつぶやき N個
[アカウント登録するとAIがあなたの思考を分析します]
[アカウント登録（準備中）]
```

---

## 8. コピーライティング原則

- キーボードっぽい言葉を使わない（「入力」→「話す」、「テキスト」→「声」）
- 果物・自然のメタファーを使う（「種を植える」「香る」「育つ」「畑」）
- 圧力をかけない（「投稿する」→「こぼす」「つぶやく」）

### UIコピー（現行）

| 場所 | コピー |
|---|---|
| マイクボタン下（待機） | 長押しして、話す |
| 長押し中 | そのまま、押し続けて… |
| 録音中 | 聴いてるよ… |
| 変換中 | 言葉にしてるよ… |
| 短すぎ | もう少し長く押してね |
| タイムライン空 | まだ誰も話していない。最初の声を植えよう。 |
| マイページ (V2) | わたしの畑 |

---

## 9. アクセシビリティ

- タッチターゲット最小 44px × 44px（マイクボタンは 140px）
- テキストコントラスト比 4.5:1 以上
- マイクボタンに `aria-label` / `aria-pressed`
- `prefers-reduced-motion` で全アニメ抑制（[globals.css](app/globals.css)）

---

## 10. 参照・インスピレーション

- **形状**: Notion AI の blob シェイプ、Arc Browser のやわらかさ
- **配色**: ゆず・柑橘系のナチュラルパレット
- **タイポ**: 有機的なセリフ体 × 日本語ゴシック
- **UX**: Twitter の投稿気軽さ × Notion の蓄積感

---

## 11. メンテナンス（自動チェック）

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
