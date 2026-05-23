import { createClient } from "@supabase/supabase-js";

// service_role キーを使用。RLS をバイパスするためサーバー専用。
// クライアントコンポーネントから絶対に import しないこと。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
