-- #69: ユーザー問い合わせ受付テーブル
--
-- アプリ内フォーム（components/ContactModal.tsx）からの問い合わせを保存する。
-- THE RECORD の世界観を保つため Tally / Zendesk 等の外部 SaaS を使わず、Supabase で完結させる。
-- Claude が Supabase MCP 経由で読み込み、トリアージ・返信ドラフト生成に使う前提。
--
-- 設計方針：
--   - 未ログインユーザーからも投稿可能（anon insert 許可、user_id は null 可）
--   - ログインユーザーは自分の行のみ select 可能（将来の「自分の問い合わせ履歴」UI 用）
--   - 編集・削除はクライアントから不可。status 変更は service_role（kyota / Claude オペレータ）のみ
--   - レート制限は API 層で実装（同一 user_id / IP の連続投稿を抑止）

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text not null,
  body text not null,
  status text not null default 'new',
  internal_note text,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

alter table public.inquiries
  add constraint inquiries_status_check
  check (status in ('new', 'in_progress', 'replied', 'closed'));

-- subject / body の長さ上限（DB 層でも担保。API でも validate する）
alter table public.inquiries
  add constraint inquiries_subject_length check (char_length(subject) between 1 and 200);

alter table public.inquiries
  add constraint inquiries_body_length check (char_length(body) between 1 and 4000);

-- status × created_at の運用クエリ用 index（Claude MCP の "new だけ取って" で使う）
create index inquiries_status_created_at_idx
  on public.inquiries (status, created_at desc);

create index inquiries_user_id_created_at_idx
  on public.inquiries (user_id, created_at desc);

-- RLS 有効化
alter table public.inquiries enable row level security;

-- 未ログイン（anon）も含めて誰でも insert 可能
create policy "inquiries_insert_any" on public.inquiries
  for insert with check (true);

-- ログインユーザーは自分の inquiry のみ参照可能
create policy "inquiries_select_own" on public.inquiries
  for select using (auth.uid() = user_id);

-- 列レベル GRANT：anon / authenticated が触れる列を絞る
-- （status / internal_note / replied_at は service_role のみ書き込み）
revoke insert, update, delete on public.inquiries from anon, authenticated;

grant insert (user_id, email, subject, body) on public.inquiries to anon, authenticated;
grant select on public.inquiries to authenticated;

-- service_role は admin client（lib/supabase/admin.ts）から status 変更や全件参照に使う。
-- Supabase の service_role はデフォルトで新テーブルに SELECT/INSERT 等が付かないため明示的に grant する。
grant select, insert, update, delete on public.inquiries to service_role;
