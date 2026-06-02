const { execSync } = require("child_process");
const { withSentryConfig } = require("@sentry/nextjs");

let buildNumber = "0";
try {
  buildNumber = execSync("git rev-list --count HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
} catch {
  /* git 不在環境ではフォールバック */
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_NUMBER: buildNumber,
  },
};

// Sentry: source map upload と auto-instrumentation。
// SENTRY_AUTH_TOKEN が無いビルド（ローカル等）では upload を skip し、wrapper は no-op で通る。
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Source map を Sentry にアップロード。Vercel 側で SENTRY_AUTH_TOKEN を設定すると有効化される
  widenClientFileUpload: true,
  // PII 抑止：client が IP/cookie を Sentry に送らないように初期値を絞る
  hideSourceMaps: true,
  disableLogger: true,
  // tunnel route 不使用（ad blocker 対策はあとで検討）
});
