import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { generateToken } from "../lib/personalAccessToken";

// 平文を DB に保存しない契約を固定する：返るのは平文 + sha256 ハッシュ + 表示用 prefix。
describe("generateToken", () => {
  it("yuzu_pat_ prefix 付きの平文を返す", () => {
    const { token } = generateToken();
    expect(token.startsWith("yuzu_pat_")).toBe(true);
  });

  it("tokenHash は平文の sha256(hex, 64桁)", () => {
    const { token, tokenHash } = generateToken();
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
  });

  it("tokenPrefix は先頭表示用（prefix + 8文字）で平文に含まれる", () => {
    const { token, tokenPrefix } = generateToken();
    expect(tokenPrefix).toBe("yuzu_pat_".length + 8 <= token.length ? token.slice(0, "yuzu_pat_".length + 8) : token);
    expect(token.startsWith(tokenPrefix)).toBe(true);
  });

  it("毎回ユニーク（高エントロピー）", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken().token));
    expect(tokens.size).toBe(50);
  });
});
