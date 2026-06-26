import { NextRequest } from "next/server";
import { verifyToken } from "./personalAccessToken";

// /api/mcp/* 専用。Cookie セッションは見ない（MCP サーバーはブラウザではない）。
export async function authenticateMcpRequest(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  return verifyToken(token);
}
