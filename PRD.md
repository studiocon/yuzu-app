# YUZU — PRD

> BE TRUE / 本物でいろ

YUZUは、声を絞り出すサービス。整えなくていい。うまく話さなくていい。長押し。話せ。あなたの声はそのまま記録になる。

> **このリポジトリは公開。** 事業計画・価格・収益モデル・GTM・競合分析・市場リサーチ・ペルソナはここに含めない（Notion に集約）。本 PRD は **製品仕様・世界観・品質基準（Eval）** のみを扱う。

---

## 1. ブランド

- **名前**：YUZU
- **タグライン**：BE TRUE
- **タグライン（日）**：本物でいろ
- **コアバリュー**：Raw. Real. You.
- **ミッション**：まだ知らない自分に、出会わせる。
- **ドメイン**：`yuzu.style`（アプリは `app.yuzu.style`、公式サイトは `yuzu.style`）

### プラットフォーム方針

- **Web版**：公式LP・ダウンロード導線、および開発確認用。
- **iOS**：メインプラットフォーム。
- **Android**：iOS 安定後に検討。

### エレベーターピッチ

YUZU という名前は、果物の柚子から来ている。柚子は絞るか、削るか、熱を加えなければ香りが出ない。出さなければ、ただの黄色い球体だ。声も同じだ。外に出さなければ、自分は自分のまま留まる。

「BE TRUE」は、シェイクスピアの「To thine own self be true.」に由来する。YUZU が届けるのは命令ではなく、許可だ。あなたはすでに本物だ。ただ、出していないだけ。

YUZUは、声を絞り出すサービス。
整えなくていい。うまく話さなくていい。
長押し。話せ。
あなたの声はそのまま記録になる。

---

## 2. コンセプト・世界観

### 2.1 コアバリュー

```
Raw  → 加工しない・整理しない・ナマのまま
Real → 本物の自分・嘘のない声
You  → 主役はあなた自身
```

### 2.2 ポジショニング

```
癒し系ジャーナル → 心を癒す場所（やさしい・内省的・自己理解）
YUZU            → 本物を絞り出す装置（クール・挑発的・記録的）
SNS             → 他人に見せる場所
YUZU            → 自分を晒す場所
```

YUZU は「癒し」を持たない。挑発・命令・信号。"肩を抱く" のではなく "胸ぐらを掴む"。他人に見せるためのものではなく、晒しても評価されない構造。記録ツールではなく、自己と対峙する装置。

### 2.3 世界観「THE RECORD」

YUZU に庭はない。林もない。育つ比喩もない。
あるのは **記録（RECORD）** だけ。

```
声を出す → 信号（SIGNAL）になる
記録する → MARK（刻印）として残る
積み重なる → INDEX（番号体系）として並ぶ
```

声は加工されない信号。記録されることでしか自分は見えない。
装飾を削ぎ落とすこと自体が "Raw" の表現になる。

---

## 3. 哲学

YUZUは "自己肯定" を一切しない。「あなたは本物だ」と励まさない。ただ「許可する」だけ。評価しないことが、最大の許可。

世のセルフケア系サービスの大半は "あなたを肯定する" モデル。YUZUは "あなたを既に本物として扱う" モデル。前提が違う。

シェイクスピア「To thine own self be true.」（自分自身に本物であれ）の現代的解釈として、YUZUは命令ではなく許可を届ける。

---

## 4. 機能要件（MVP v1）

### 基本構成

- **2タブ + FAB 構成（順序固定）**：左から `LOG`（**デフォルト**・自分が出した記録）/ `INSIGHT`（AI 解釈：EMOTION / SIGNAL / WORDS / PATTERN / REPORTS）。LOG と INSIGHT は **情報の出どころが違う**ため分離（バランス目的の追加ではない）。録音は **独立した RECORD FAB**（タブバー右に並ぶ正円ボタン）で起動し、タブの state を持たない。旧「ホーム」「マイページ（ME）」「PROFILE」「TALK タブ（旧 3 タブ中央のマイク）」は廃止。下部のドックは iOS 26 Liquid Glass 風のフローティング pill（タブ）と FAB が横並び。
- **ユーザー identity は通し番号 `#NNN` のみ**。SNS 機能を持たないため、自己を他人に示すアイコン・名前は不要。ニックネーム登録 / 果物絵文字アイコンは v2 で全廃止。
- **認証必須**（MVP v1 から）：Apple Sign In / Google OAuth / Magic Link（メール OTP）の 3 種。パスワード認証は **作らない**。未ログインユーザーには `/` でオンボーディング（録音 → STT → 「刻む」で LoginModal）を見せ、初投稿はログイン後にコミットされる。
- **未ログイン STT 上限：1 日 1 回**（cookie ベース・[app/api/transcribe/route.ts](app/api/transcribe/route.ts) 内 `ANON_DAILY_STT_LIMIT`）。2 回目以降は **429 `login_required`** を返し、クライアントは自動的に `LoginModal` を開く。cookie 改竄は可能だが「お試し体験」と「保護」のバランスとしては必要十分。厳密化は将来 IP rate limit（Upstash 等）で対応する余地を残す。
- **タイムラインはプライベート**（自分の投稿のみ）。他ユーザーの投稿は表示しない（RLS で強制）。

### 投稿

- マイクボタン長押し中のみ録音（MediaRecorder）
- 離した瞬間に自動で STT（ElevenLabs Scribe v2）送信
- テキスト変換後、自動投稿
  - **MVP**：生音声は破棄。テキストのみ保存。
  - **音声保存は将来の有料機能**（詳細は非公開）として実装予定。MVP段階では維持しない。
- 編集・削除不可
- テキスト入力欄なし
- NGタグ（[background noise] 等）を除去してから保存
- 5文字未満の発話は破棄しフィードバック表示

### LOG（自分が出した記録 / 独立タブ・デフォルト）

ヘッダー左上の **ページ名 `LOG.`** が見出しを兼ねる（画面内には別途タイトルを置かない）。上から下へ「抽象 → 具体」で縦に積み、**`RECORDS` で完結する**（PROFILE・INSIGHT を含まない）。

1. **STATS（横3列）** — `RECORDS` / `MINUTES` / `STREAK`。
2. **RECORDS** — 自分の RECORD 一覧（新着順）。見出し右に `ALL / MARKED` フィルタトグル1つだけ。`MARKED` は MARK 済みのみ抽出。

設定（`/settings`）はヘッダー右上の歯車アイコンに据え置く。`#NNN`（通し番号）は各 RECORD カード上に表示し、identity として機能する。

### INSIGHT（AI 解釈 / 独立タブ）

LOG とは情報の出どころが違うため別タブ。ヘッダー左上は **`INSIGHT.`**。上から「短期 → 長期」で 5 ブロックを縦に積む。

- **EMOTION** — Claude API のセンチメントスコアを折れ線グラフで表示（[components/LongSentimentChart.tsx](components/LongSentimentChart.tsx)）
- **SIGNAL** — 過去 42 日 × 4 時間バケット（縦6行）の時間帯ヒートマップ（[components/TimeHeatmap.tsx](components/TimeHeatmap.tsx)）。各セルはその時間帯の投稿文字数合計に応じて opacity 0.2〜1.0 で濃淡。ホバー/フォーカスで `MM/DD HH:00 / N CHARS` tooltip。「俺、夜11時に吐き出しがち」のような自分のリズム発見が狙い
- **WORDS** — 全投稿から頻出語 20 個を抽出してバブルマップ化（[components/WordBubbleMap.tsx](components/WordBubbleMap.tsx)）。形態素解析は TinySegmenter、配置は d3-hierarchy の pack。タップで弾性バウンス（自バブル + 隣接バブルが距離 delay で連動）。「自分がこんな言葉ばっか使ってたのか」という気づきを与える
- **PATTERN** — Claude が全投稿を読んで「無意識に繰り返し語っているテーマ」を最大 5 つ抽出・**マインドシェア型ランキング** で表示（[components/RecurringThemes.tsx](components/RecurringThemes.tsx)）。各テーマが「あなたの声のうち何%を占めるか」を黄色の横バーで可視化。バブルマップが「生の単語」なら PATTERN は「意味の塊」。WORDS は浅い・即時、PATTERN は深い・じわじわ
  - 投稿 10 件未満は「もっと話せ、パターンが見えてくる」表示
  - サーバ側で Supabase `theme_cache` に永続キャッシュ（user_id を PK、24h TTL、`post_count` が変われば invalidate。読み取りは RLS で自分の行のみ、書き込みは service_role）
- **REPORTS** — 週次・月次レポートカードを一覧表示（[components/ReadView.tsx](components/ReadView.tsx)）
- "MORE →" で `/reports` 詳細へ遷移

API は [app/api/insights/words/route.ts](app/api/insights/words/route.ts) / [app/api/insights/heatmap/route.ts](app/api/insights/heatmap/route.ts) / [app/api/insights/themes/route.ts](app/api/insights/themes/route.ts)。集計・型は [lib/wordAnalysis.ts](lib/wordAnalysis.ts) / [lib/heatmap.ts](lib/heatmap.ts) / [lib/themes.ts](lib/themes.ts)（SDK 非依存はクライアントとも共有、Claude 呼び出しはサーバ専用）。Mock mode（`?mock=1`）ではクライアント側で同等の集計または hardcoded 例（PATTERN は `MOCK_THEMES`）を使う。fetch + mock の共通パターンは [lib/useInsightData.ts](lib/useInsightData.ts)。

### MARK（刻印）— v2 常時トグル

YUZU は編集・削除を許さない。その代わりユーザーに **唯一許された能動操作** が MARK。「これは本物だった」と未来の自分から過去の声へ刻印する行為。「お気に入り」「いいね」「ブックマーク」とは呼ばない。

**仕様**
- 各 RECORD カード右端の常時トグルボタン（PushPin / PushPinSlash）。v1 の長押し検出は廃止。
- 黄色枠なし。色の差分（線→塗り、`--ink-muted` → `--yuzu-zest`）のみで状態表現。タッチターゲット 44px。
- `records.marked: boolean` で永続化（[supabase/migrations/0004_mark.sql](supabase/migrations/0004_mark.sql)）
- INDEX `RECORDS` に `ALL` / `MARKED` フィルタ（MARKED = `marked === true` のみ）
- 操作直後に `MARKED.`（Unbounded 700・`--yuzu-zest`）を 0.9s フラッシュ
- MARKED 空表示は `MARK されたものは無い。`
- MARK と編集・削除は別概念。UI 上は鉛筆・ゴミ箱アイコンを使わない

### COPY（一時機能 / ⚠️ 将来削除予定）

オーナーは現在ジャーナリングを Notion でも運用している。YUZU で十分に振り返れるようになり **本人が Notion 併用を止めたタイミング** でこの機能は削除する **恒久 UI ではない**。

**削除条件（確定）**: オーナー本人が Notion への移行を完了し、YUZU 単独で運用する判断をしたら次の commit で撤去する。第三者ユーザーの利用率は判断材料にしない（オーナー個人のワークフロー基準）。

**実装メモ**
- RECORD カード右端に Copy アイコンを配置（MARK と同等の低主張アイコン）
- クリックで本文 + `#NNN` + 日時をクリップボードへコピー
- 操作直後に `COPIED.` を 0.9s フラッシュ
- コード上に `// TEMPORARY: Notion移行期間限定...` コメント必須（[components/RecordCard.tsx](components/RecordCard.tsx)）

### INDEX番号

ユーザーごとの投稿通し番号。話すたびに1ずつ増加する個人の記録番号。

**ルール**
- 1始まり・ゼロ埋めなし（`#1` `#247` `#10000`）
- 削除・編集不可のため欠番は発生しない
- 上限：999999（6桁）
- 呼称「インデックス番号」はUI上に出さない。`#` + 数字のみ。

**表示箇所**

| 場所 | 形式 | スタイル |
|---|---|---|
| 投稿カード（タイムライン） | `#N · X時間前` | Unbounded 700 / `--ink-muted` / 11px |
| 投稿完了モーダル | `RECORDED.` の下に `#N` | Unbounded 700 / `--ink` / 32px |
| INDEX 通し番号ヘッダー | `#NNN` | Unbounded 700 / `--text-3xl` / ゼロ埋め3桁 |
| 週次レポート | `WEEK #N` | Unbounded 700 / 18px（登録日からの週数） |
| 月次レポート | `MONTH #N` | Unbounded 700 / 18px（登録日からの月数） |

**INDEX 算出**

`records` テーブルに `index` カラムは持たない。`/api/records` GET / POST が以下で都度算出する：

```ts
// app/api/records/route.ts
index = total_count - position   // 最新（position=0）が最大値
```

編集・削除不可なので欠番は発生しない。WEEK・MONTH は登録日（`profiles.created_at`）からの経過で自動算出（保存不要）。

### モーダル（録音画面）

- 背景：**オフホワイト単色** `#FAFAF5`
- 上半分：アニメーションエリア
  - 待機中：**浮遊するドット**（既存 `float-dot` 維持）
  - 録音中：**音量に反応する波形**（既存波形アニメ維持）＋ 同心円リング
  - 変換中：ドットが中心に集まり消える
- 下部：マイクボタン（正円。歪んだ楕円シェイプは廃止）
- 録音完了後：**`RECORDED.`** ＋ `#INDEX` ＋ 投稿テキスト → INDEX に反映
  - 続けて 7日ストリーク帯と累計 STATS（`MINUTES` = 総録音分数 / `STREAK` = 連続日数）を 0 からカウントアップ表示（`prefers-reduced-motion` 時は即着地）
  - 下部 CTA は「閉じる」のみ（画像書き出しは廃止）

### UIコピー

英語＝状態ラベル（Unbounded）／日本語＝プロンプト・本文・エラー（LINE Seed JP）として使い分ける。**コピーの正本は [DESIGN.md](DESIGN.md) §4 Voice & Tone**（コードと同期）。

### 技術スタック

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照。STT は ElevenLabs Scribe v2、感情分析・レポートは Anthropic Claude、DB / Auth は Supabase、ホスティングは Vercel。

---

## 5. 機能要件（V2）

- **Supabase Auth（認証）+ DB導入**（Google / Apple ログイン）
  - iOS：Apple ログイン（必須）+ Google ログイン
  - Android：Google ログインのみ
  - Web：Google ログインのみ
- AIインサイト週次レポート（Claude API）
- ElevenLabs TTS（インサイト読み上げ）
- 公開・非公開選択
- **YUZU INDEX グラフィック展開**（投稿日数連動の番号アンロック）
- **過去ログ連動の挑発プロンプト生成**（Claude API）
  - 録音モーダルを開いた瞬間、固定プロンプトではなく「その人だけに効く挑発」を1つ生成して表示
  - 例：「3日前、逃げてるって言ってたな。今は？」「先週の怒り、まだ残ってるか？」
  - 直近 N 件（3〜5件）の本音ログを Claude API へ送信し、Voice & Tone 制約（短く・断定・命令形・NGワード禁止）を満たす1文を返す
  - 表示までのレイテンシは固定プロンプトを先に出してから差し替え（チラつかない）
  - 失敗・タイムアウト・投稿0件は固定プロンプトにフォールバック
  - **プライバシー検討必須**：生の本音ログを外部APIへ送る機能なので、ユーザー同意・送信件数明示・オプトアウト導線をV2着手時に設計
- **音声アーカイブ（将来の有料機能）**
  - 有料プランで、投稿時の生音声を保存する
  - 再生は**本人のみ**。タイムライン・他ユーザーには一切音声を出さない（テキストのみ表示）
  - 目的：テキストには残らない「その瞬間の声＝感情の記録」を残す。DAY 100にDAY 1の自分の声を聴ける体験
  - 技術：音声は Supabase Storage に保存。テキストは `public.records`（Supabase Postgres）
  - 音声も編集・削除不可。刻印思想は音声にも適用される

---

## 6. 機能要件（V3）

- 関連投稿AI自動リンク
- 思考クラスター可視化
- YUZU Wear 購入権連動（投稿日数で MARK 番号が解放）

---

## 7. 非機能要件

### アクセシビリティ

- タッチターゲット最小 44px × 44px（マイクボタンは 140px）
- テキストコントラスト比 4.5:1 以上
- マイクボタンに `aria-label` / `aria-pressed`
- `prefers-reduced-motion` で全アニメ抑制

### パフォーマンス

TODO: 追記

### セキュリティ

TODO: 追記

---

## 8. 制約・設計思想

意図的に削ぎ落としている。

- 音声入力のみ（テキスト入力欄なし）
- 編集不可（テキスト・音声ともに）
- 削除不可（テキスト・音声ともに）
- フォロー / いいね / リポストなし
- **キャラクター方針**：アプリ内にキャラクターは登場させない。「THE RECORD」の世界観（信号・記録・番号）を守る。
- **ニックネーム / ユーザーアイコン / プロフィール表示なし**。SNS 機能を持たないため、identity は通し番号 `#NNN` のみ（v2）。
- **1日上限（フリープラン 3 回）はサーバ側で強制**（[app/api/records/route.ts](app/api/records/route.ts) の POST が `records` テーブルを JST 00:00 起点でカウントし、超過時 429 を返す）。複数端末でログインしてもカウントが同期される。localStorage は mock-mode 専用のフォールバック。
- **MARK（刻印）のみユーザーに許された能動操作**。編集・削除は依然不可。MARK は「お気に入り」ではなく、過去の声を本物として選び直す行為。
- **COPY（本文クリップボードコピー）は Notion 移行期間限定の一時機能**。将来削除する恒久 UI ではない（[components/RecordCard.tsx](components/RecordCard.tsx) に `// TEMPORARY:` コメント済）。
- **DM・音声メッセージ等の対人コミュニケーション機能を持たない**。YUZUのコアは「誰にも向けない声」であり、聞き手の存在が「整えるプレッシャー」を生む。思想と矛盾するため、意図的に除外する。

「整理する前」の生っぽい思考に価値があるという思想に基づく。

---

## 9. Eval（品質基準・テストケース）

> PRD の要件変更時は、対応する Eval ケースも同時に更新すること。

### STT（ElevenLabs Scribe v2）

**成功基準**：3秒以内・日本語として読める・NGタグ除去済み

- 30秒音声 → 句読点ありテキスト・3秒以内
- 無音・環境音 → 保存されない・フィードバック表示
- NGタグ → 除去されてから保存される
- 5文字未満 → 保存されない・フィードバック表示

### 感情分析（Claude API）

**成功基準**：自然な日本語・200文字以内・断定的ネガティブ表現なし

- ポジティブ投稿10件 → 前向きな要約
- ネガティブ投稿10件 → 断定的なネガティブ表現にならない
- NGケース：「あなたはネガティブです」→ 不合格

### モーダルUX

**成功基準**：録音→投稿→INDEX 反映が自然なフロー

- 待機中：浮遊ドットが軽快に動く
- 録音中：波形アニメーションが音量に反応する
- 完了後：`RECORDED.` ＋ 投稿テキスト
- INDEX に戻る：`#NNN` / RECORDS 一覧に反映されている

### コピートーン

**成功基準**：NGワード（癒し・寄り添う・育つ・香り・林・種・やさしく・ふんわり）がUI上に登場しないこと
