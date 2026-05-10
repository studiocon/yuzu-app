import { cookies } from "next/headers";

const COOKIE_NAME = "yuzu_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getOrCreateSessionId(): { id: string; isNew: boolean } {
  const jar = cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return { id: existing, isNew: false };
  const id = crypto.randomUUID();
  return { id, isNew: true };
}

export function setSessionCookie(res: Response, id: string) {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${id}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`,
  );
}

export const SESSION_COOKIE = COOKIE_NAME;
