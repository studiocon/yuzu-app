-- #79: PATTERN テーマキャッシュを Supabase に永続化
--
-- これまで app/api/insights/themes/route.ts は in-memory Map でキャッシュしていたが、
-- Vercel serverless のコールドスタートで消失し、想定の 5〜10 倍 Claude API を呼ぶ恐れがあった。
-- user_id を PK にして 1 ユーザー 1 行で永続化する。
--   - post_count 変化で自然 invalidate（既存ロジックを維持）
--   - TTL 24h は generated_at で判定（アプリ側）
--
-- RLS: 本人の行のみ SELECT 可。書き込みは service_role（lib/supabase/admin.ts）のみ。
-- authenticated ロールには INSERT/UPDATE/DELETE を与えない（GRANT しない）。

create table public.theme_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  themes jsonb not null,
  post_count int not null,
  generated_at timestamptz not null default now(),
  model text not null
);

alter table public.theme_cache enable row level security;

-- 本人の行のみ読める。INSERT/UPDATE/DELETE ポリシーは作らない（= authenticated は書けない）。
create policy "theme_cache_select_own" on public.theme_cache
  for select using (auth.uid() = user_id);

-- 「Automatically expose new tables」が OFF の場合に備えて明示的に GRANT。
-- SELECT のみ（RLS で自分の行に限定）。書き込みは service_role が保持。
grant select on public.theme_cache to authenticated;
