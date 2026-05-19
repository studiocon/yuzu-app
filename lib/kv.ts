import { createClient, type RedisClientType } from "redis";
import type { Post } from "./types";

export type { Post };

const postsKey = (sid: string) => `posts:${sid}`;
const itemKey = (id: string) => `posts:item:${id}`;
const indexKey = (sid: string) => `user:${sid}:index`;

declare global {
  // eslint-disable-next-line no-var
  var __yuzuRedis: RedisClientType | undefined;
}

export async function getRedis(): Promise<RedisClientType> {
  return getClient();
}

async function getClient(): Promise<RedisClientType> {
  if (global.__yuzuRedis && global.__yuzuRedis.isOpen) return global.__yuzuRedis;
  const url = process.env.KV_REDIS_URL || process.env.REDIS_URL;
  if (!url) throw new Error("KV_REDIS_URL not set");
  const client: RedisClientType = createClient({ url });
  client.on("error", (e) => console.error("redis error", e));
  await client.connect();
  global.__yuzuRedis = client;
  return client;
}

// Returns the new index number assigned to this post.
export async function createPost(p: Omit<Post, "index">): Promise<number> {
  const r = await getClient();
  const idx = await r.incr(indexKey(p.sessionId));
  await r.hSet(itemKey(p.id), {
    id: p.id,
    text: p.text,
    createdAt: String(p.createdAt),
    emoji: p.emoji,
    sessionId: p.sessionId,
    index: String(idx),
  });
  await r.zAdd(postsKey(p.sessionId), { score: p.createdAt, value: p.id });
  return idx;
}

export async function listPosts(sessionId: string, limit = 50): Promise<Post[]> {
  const r = await getClient();
  const ids = await r.zRange(postsKey(sessionId), 0, limit - 1, { REV: true });
  if (ids.length === 0) return [];

  const results = await Promise.all(
    ids.map(async (id) => {
      const raw = await r.hGetAll(itemKey(id));
      if (!raw || Object.keys(raw).length === 0) return null;

      let index: number;
      if (raw.index) {
        index = Number(raw.index);
      } else {
        // Backward compat: derive index from ascending rank in sorted set.
        const rank = await r.zRank(postsKey(sessionId), id);
        index = rank !== null ? rank + 1 : 0;
      }

      return {
        id: String(raw.id ?? id),
        text: String(raw.text ?? ""),
        createdAt: Number(raw.createdAt ?? 0),
        emoji: String(raw.emoji ?? "🍑"),
        sessionId: String(raw.sessionId ?? sessionId),
        index,
      } satisfies Post;
    }),
  );

  return results.filter((p): p is Post => p !== null);
}
