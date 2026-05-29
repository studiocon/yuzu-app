const { execSync } = require("child_process");

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

module.exports = nextConfig;
