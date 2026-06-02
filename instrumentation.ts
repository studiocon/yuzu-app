// Next.js 14 App Router の hook：サーバ起動時に Sentry を初期化する。
// 環境ごとに適切な config を読み込む。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[]> },
  context: { routerKind: string; routePath: string; routeType: string },
) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
