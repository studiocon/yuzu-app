# notes/legal/

YUZU の法務文書（利用規約・プライバシーポリシー等）のドラフト置き場。

## ファイル

- [terms-v1-draft.md](terms-v1-draft.md) — 利用規約 v1
- [privacy-v1-draft.md](privacy-v1-draft.md) — プライバシーポリシー v1

## 運用ルール

- **改訂履歴は git commit log で追う**。文書内に「改訂履歴」セクションは置かない
- 文書を実質的に変更したコミットは `docs(legal): ...` を prefix にする
- v1 → v2 のような大改訂は **ファイル名を変えず本文 frontmatter のバージョンだけ上げる**（diff の追いやすさ優先）
- 課金開始（#65）前に弁護士レビュー → 確定版を `yuzu.style` リポジトリの `app/terms/page.tsx` / `app/privacy/page.tsx` へ移管
- 移管後はこの notes/legal/ を **アーカイブ用 read-only** として残す

## 関連 Issue

- #61 利用規約・プライバシーポリシーの作成（このディレクトリの起点）
- #67 公式サイト yuzu.style の作成（移管先）
- #105 規約・プライバシーポリシーの公開 URL 確定（移管後）
