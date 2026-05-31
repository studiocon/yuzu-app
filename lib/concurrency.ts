// Promise.all の代替。最大 n 並列で items を fn に流す。
// Anthropic / ElevenLabs 等の RPM 制限を尊重するために使う。
//
// 結果の順序は入力 items と一致する。fn が throw した場合は throw が伝播する
// （Promise.all と同じ挙動）。throw を握り潰したい場合は fn 側で catch する。

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const n = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        results[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return results;
}
