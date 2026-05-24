import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ログイン必須のルートプレフィックス
const PROTECTED = ["/reports", "/settings"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // トークンリフレッシュ（毎リクエスト必須）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isMock = request.cookies.get("yuzu-mock-mode")?.value === "1";

  if (isProtected && !user && !isMock) {
    // 未ログインで保護ルートへアクセスした場合はホームへ（mock-mode はバイパス）
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Next.js 内部・静的ファイルは除外
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
