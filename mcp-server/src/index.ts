#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = (process.env.YUZU_API_BASE_URL ?? "https://yuzu.style").replace(/\/$/, "");
const TOKEN = process.env.YUZU_API_TOKEN;

if (!TOKEN) {
  console.error("YUZU_API_TOKEN が未設定。Settings > API トークン で発行して環境変数に渡せ。");
  process.exit(1);
}

async function callYuzuApi(path: string, params: Record<string, string | undefined>) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`YUZU API ${res.status}: ${body}`);
  }
  return body;
}

const server = new McpServer({
  name: "yuzu-mcp-server",
  version: "0.1.0",
});

server.registerTool(
  "get_records",
  {
    title: "YUZU の録音記録を取得",
    description:
      "ユーザーが声で記録した投稿（文字化されたテキスト）を新しい順に取得する。" +
      "メンタルの状態や言語化できていない悩みを読み取りたい時に使う。",
    inputSchema: {
      limit: z.number().int().min(1).max(500).optional().describe("取得件数の上限（既定100、最大500）"),
      since: z.string().optional().describe("この時刻以降の記録のみ取得（ISO 8601）"),
      until: z.string().optional().describe("この時刻より前の記録のみ取得（ISO 8601）"),
    },
  },
  async ({ limit, since, until }) => {
    const body = await callYuzuApi("/api/mcp/records", {
      limit: limit?.toString(),
      since,
      until,
    });
    return { content: [{ type: "text", text: body }] };
  },
);

server.registerTool(
  "get_reports",
  {
    title: "YUZU の週次/月次レポートを取得",
    description:
      "週・月単位で生成された傾向レポート（見出し・トピック・感情の波）を取得する。" +
      "「先月どうだった」のような期間を跨いだ振り返りに使う。",
    inputSchema: {
      scope: z
        .enum(["recent", "all"])
        .optional()
        .describe("recent: 直近の確定期間のみ（既定） / all: 生成済みレポートも含めた全期間"),
    },
  },
  async ({ scope }) => {
    const body = await callYuzuApi("/api/mcp/reports", { scope });
    return { content: [{ type: "text", text: body }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("yuzu-mcp-server failed to start:", err);
  process.exit(1);
});
