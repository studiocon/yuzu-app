-- 個人利用 MCP 連携用のパーソナルアクセストークン。
-- 平文は保存しない（sha256 ハッシュのみ）。失効は行削除（ソフト削除フラグは持たない）。

create table public.personal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'MCP',
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index personal_access_tokens_user_id_idx
  on public.personal_access_tokens (user_id);

alter table public.personal_access_tokens enable row level security;

create policy "pat_select_own" on public.personal_access_tokens
  for select using (auth.uid() = user_id);

create policy "pat_insert_own" on public.personal_access_tokens
  for insert with check (auth.uid() = user_id);

create policy "pat_delete_own" on public.personal_access_tokens
  for delete using (auth.uid() = user_id);

-- Settings UI（発行・一覧・失効）は authenticated（cookie セッション）経由
grant select, insert, delete on public.personal_access_tokens to authenticated;

-- /api/mcp/* の Bearer 検証 + last_used_at 更新は service_role（RLS バイパス）のみ
-- service_role は postgres ロールを継承しないため明示 GRANT が必要（#103 / 0012,0013 参照）
grant select, update on public.personal_access_tokens to service_role;
