# yuzu-mcp-server

YUZU の録音記録・レポートを Claude Desktop から読むための個人用 MCP サーバー。

声で記録した投稿をそのまま読ませて「先月のメンタルどうだった」「言語化できていない悩みは」のような問いに使う。読み取り専用。記録の作成・編集・削除はできない。

## できること

- `get_records` — 記録（文字化テキスト）を新しい順に取得（`limit` / `since` / `until` で絞り込み）
- `get_reports` — 週次/月次レポート（見出し・トピック・感情の波）を取得（`scope=recent|all`）

レポート生成（Anthropic 呼び出し）はこのサーバーからは行わない。YUZU 本体で生成済みのものだけを読む。

## 前提

- Claude Desktop（Custom Connectors ではなく、ローカル MCP サーバーとして登録する方式。Claude.ai の Web/モバイルからは使えない）
- Node.js 18 以上
- YUZU のアカウントとパーソナルアクセストークン

## 1. トークンを発行する

YUZU にログイン → 設定 → CONNECT → API トークン → 「トークンを発行」。

表示されたトークン（`yuzu_pat_...`）はその場でしかコピーできない。閉じたら二度と見れない。失くしたら同じ画面から削除して再発行する。

## 2. ビルドする

```bash
cd mcp-server
npm install
npm run build
```

`dist/index.js` が生成される。

## 3. Claude Desktop に登録する

Claude Desktop の設定ファイル（`claude_desktop_config.json`）の `mcpServers` に追記する。

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yuzu": {
      "command": "node",
      "args": ["/absolute/path/to/yuzu-app/mcp-server/dist/index.js"],
      "env": {
        "YUZU_API_TOKEN": "yuzu_pat_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

`args` は環境に合わせた絶対パスに置き換える。Claude Desktop を再起動すると `yuzu` サーバーが認識される。

## 環境変数

| 変数 | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `YUZU_API_TOKEN` | ◯ | なし | Settings > API トークン で発行したトークン |
| `YUZU_API_BASE_URL` | - | `https://app.yuzu.style` | 自前デプロイ等で API のオリジンを変えたい場合のみ指定 |

## トラブルシュート

- 起動直後に落ちる → `YUZU_API_TOKEN` が渡っていない。Claude Desktop の `env` 設定を確認する
- ツール呼び出しが 401 → トークンが削除/失効している。Settings で再発行する
