import { defineConfig } from "vitest/config";

// 純粋ロジック（lib/ 配下の SDK 非依存関数）のユニットテスト。
// jsdom は不要なので node 環境で走らせる。tests/ 配下のみを対象にする。
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
