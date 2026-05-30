# YUZU — BE TRUE / 本物でいろ

> 整えるな。話せ。あなたの声はそのまま記録になる。
> **Raw. Real. You.**

**YUZU** is a voice journaling app built on a single refusal: *don't polish your thoughts.*
You press and hold, you speak, and your raw voice becomes a record — unedited, undeletable, never rewritten. YUZU は「声を加工せずに記録する」音声ジャーナル。

🌐 **[yuzu.style](https://yuzu.style)**

---

## What is YUZU

声を絞り出す音声ジャーナル。マイクを長押しして話すだけで記録になる。整える前のナマの思考を、整えないまま残す。**書く**のではなく、**話す**。**編集する**のではなく、**刻む**。

世界観は **THE RECORD**。庭も、林も、育つ比喩もない。あるのは記録（RECORD）だけ。

```
声を出す   → 信号（SIGNAL）になる
記録する   → MARK（刻印）として残る
積み重なる → INDEX（番号体系）として並ぶ
```

## Philosophy — なぜ「整えない」のか

整えた言葉は、自分の言葉ではなく、社会に通じる言葉になる。本当に知りたい自分の輪郭は、整える前の、口ごもり・言い直し・沈黙の中にある。YUZU はその粗さを記録として残すための **装置** であって、思考を綺麗にするツールではない。

YUZU が他の音声ジャーナルと違うのは、**機能を足すのではなく、引いている**こと：

- **編集できない。** 一度話した声は書き換えられない。
- **削除できない。** 黒歴史も記録の一部として残る。
- **テキスト入力もない。** 文字で整えることを許さない。
- **AI が問い返さない。** 一方向の吐き出しに徹する。評価も励ましもしない。
- **整える前の思考が記録になる。** うまく話そうとした瞬間、それはもう YUZU ではない。

YUZU は **ミラー**であって、サポーターではない。"肩を抱く" のではなく、鏡を突きつける。自己肯定はしない。「あなたは本物だ」と励まさない。ただ **許可する** だけ。評価しないことが、最大の許可。

## The Name

柚子は、絞るか、削るか、熱を加えなければ香りが出ない。出さなければ、ただの黄色い球体だ。
声も同じ。外に出さなければ、自分は自分のまま留まる。

「BE TRUE」はシェイクスピアの "To thine own self be true." に由来する。YUZU が届けるのは命令ではなく、**許可**だ。あなたはすでに本物だ。ただ、出していないだけ。

## Mission

> **まだ知らない自分に、出会わせる。**

## Who is it for

ジャーナリングに興味はあるが続かなかった人。SNS に疲れて、本音を出せる場所がない人。整った言葉ではなく、まだ言葉になっていないものを出したい人。

## Voice & Tone

YUZU の言葉は **短く・力強く・断定的**。命令形を恐れない（NIKE 寄り）。詩的にもスピリチュアルにもならない。

- **英語 = 状態・挑発**：`RECORDING.` / `CARVING.` / `RECORDED.` / `SILENCE.`
- **日本語 = 事実・本文**：「長押し。話せ」「無音、話せ」

「癒し」「寄り添う」「頑張ろう」「育つ」「やさしく」は使わない。トーンの全規約は [DESIGN.md](DESIGN.md) §4 を参照。

---

## Documentation

| ドキュメント | 内容 |
|---|---|
| [PRD.md](PRD.md) | 製品要件・機能仕様・品質基準（Eval）・世界観 |
| [DESIGN.md](DESIGN.md) | デザインシステム（カラー・タイポ・コンポーネント・Voice & Tone）。視覚の source-of-truth は [public/design-preview.html](public/design-preview.html) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 技術スタック・ディレクトリ構成・ローカル開発・Supabase セットアップ・検証フロー |
| [CLAUDE.md](CLAUDE.md) | Claude Code でこのリポジトリに作業させる際の規約 |
| [docs/deploy.md](docs/deploy.md) | 本番デプロイ・マイグレーション・ロールバック手順 |

> 事業計画・価格・GTM・市場分析はこのリポジトリには含めない（別途管理）。

## Quick start

```bash
npm install
cp .env.local.example .env.local   # 各キーを設定（詳細は ARCHITECTURE.md）
npm run dev                         # http://localhost:3000
```

Supabase 未設定でも `http://localhost:3000/?mock=1` で UI 全体を試せる。

## License

Private project.
