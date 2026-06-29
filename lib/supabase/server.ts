import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は set できないため無視
          }
        },
      },
    }
  );
}

// #100: native（cookie を持てない）向けに Authorization: Bearer <access_token> も受け付ける。
// Web は今まで通り cookie 経由（上の createClient）。route handler はこちらを呼べば両対応になる。
export async function getAuthedClient(
  req: NextRequest,
): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; user: User | null }> {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];

  if (bearer) {
    // anon key + 明示 Authorization で RLS をそのユーザーとして通す（Supabase 公式パターン）。
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearer}` } } },
    );
    const { data: { user } } = await supabase.auth.getUser(bearer);
    return { supabase, user };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
