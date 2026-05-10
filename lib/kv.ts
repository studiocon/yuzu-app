import { createClient, type RedisClientType } from "redis";
import { STAMPS, type Stamp, isStamp } from "./stamps";

export type Post = {
  id: string;
  text: string;
  createdAt: number;
  emoji: string;
  blob: [string, string, string];
  sessionId: string;
};

export type PostWithReactions = Post & {
  reactions: Record<Stamp, number>;
  reacted: Stamp[];
};

const LIST_KEY = "posts:list";
const itemKey = (id: string) => `posts:item:${id}`;
const reactionsKey = (id: string) => `posts:reactions:${id}`;
const reactedByKey = (id: string, sid: string) => `posts:reactions:${id}:by:${sid}`;

const emptyCounts = (): Record<Stamp, number> => {
  const out = {} as Record<Stamp, number>;
  for (const { stamp } of STAMPS) out[stamp] = 0;
  return out;
};

declare global {
  // eslint-disable-next-line no-var
  var __yuzuRedis: RedisClientType | undefined;
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

export async function createPost(p: Post): Promise<void> {
  const r = await getClient();
  await r.hSet(itemKey(p.id), {
    id: p.id,
    text: p.text,
    createdAt: String(p.createdAt),
    emoji: p.emoji,
    blob: JSON.stringify(p.blob),
    sessionId: p.sessionId,
  });
  await r.zAdd(LIST_KEY, { score: p.createdAt, value: p.id });
}

export async function listPosts(sessionId: string, limit = 50): Promise<PostWithReactions[]> {
  const r = await getClient();
  const ids = await r.zRange(LIST_KEY, 0, limit - 1, { REV: true });
  if (ids.length === 0) return [];

  const results = await Promise.all(
    ids.map(async (id) => {
      const [raw, reactions, mySet] = await Promise.all([
        r.hGetAll(itemKey(id)),
        r.hGetAll(reactionsKey(id)),
        r.sMembers(reactedByKey(id, sessionId)),
      ]);
      if (!raw || Object.keys(raw).length === 0) return null;

      const counts = emptyCounts();
      for (const [k, v] of Object.entries(reactions)) {
        if (isStamp(k)) counts[k] = Number(v) || 0;
      }
      const reacted: Stamp[] = mySet.filter(isStamp);

      const blob = parseBlob(raw.blob);

      return {
        id: String(raw.id ?? id),
        text: String(raw.text ?? ""),
        createdAt: Number(raw.createdAt ?? 0),
        emoji: String(raw.emoji ?? "🍑"),
        blob,
        sessionId: String(raw.sessionId ?? ""),
        reactions: counts,
        reacted,
      } satisfies PostWithReactions;
    }),
  );

  return results.filter((p): p is PostWithReactions => p !== null);
}

function parseBlob(v: unknown): [string, string, string] {
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr) && arr.length === 3) return arr as [string, string, string];
    } catch {}
  }
  return [
    "48% 52% 42% 58% / 49% 64% 36% 51%",
    "52% 48% 58% 42% / 56% 44% 62% 38%",
    "44% 56% 46% 54% / 42% 58% 44% 56%",
  ];
}

export async function postExists(id: string): Promise<boolean> {
  const r = await getClient();
  return (await r.exists(itemKey(id))) === 1;
}

export type ToggleResult = {
  reacted: boolean;
  count: number;
};

export async function toggleReaction(
  postId: string,
  sessionId: string,
  stamp: Stamp,
): Promise<ToggleResult> {
  const r = await getClient();
  const setKey = reactedByKey(postId, sessionId);
  const hKey = reactionsKey(postId);
  const added = await r.sAdd(setKey, stamp);
  if (added === 1) {
    const count = await r.hIncrBy(hKey, stamp, 1);
    return { reacted: true, count };
  }
  await r.sRem(setKey, stamp);
  const count = await r.hIncrBy(hKey, stamp, -1);
  if (count < 0) {
    await r.hSet(hKey, stamp, "0");
    return { reacted: false, count: 0 };
  }
  return { reacted: false, count };
}
