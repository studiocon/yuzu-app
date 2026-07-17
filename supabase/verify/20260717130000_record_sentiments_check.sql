-- ========================================================================
-- 20260717130000_record_sentiments.sql 適用後の検証スクリプト
-- ------------------------------------------------------------------------
-- 使い方:
--   Supabase Studio SQL Editor（service_role / owner モード）で実行し、
--   各セクションの「期待」と一致することを確認する。
-- ========================================================================

-- ① authenticated は SELECT のみ、INSERT/UPDATE/DELETE は不可
-- 期待: can_select=true, can_insert=false, can_update=false, can_delete=false
select
  has_table_privilege('authenticated', 'public.record_sentiments', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'public.record_sentiments', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'public.record_sentiments', 'UPDATE') as can_update,
  has_table_privilege('authenticated', 'public.record_sentiments', 'DELETE') as can_delete;

-- ② anon は一切触れない
-- 期待: 4項目とも false
select
  has_table_privilege('anon', 'public.record_sentiments', 'SELECT') as anon_can_select,
  has_table_privilege('anon', 'public.record_sentiments', 'INSERT') as anon_can_insert,
  has_table_privilege('anon', 'public.record_sentiments', 'UPDATE') as anon_can_update,
  has_table_privilege('anon', 'public.record_sentiments', 'DELETE') as anon_can_delete;

-- ③ service_role は読み書き全部できる（RLS はバイパスするが GRANT 自体も必須）
-- 期待: 4項目とも true
select
  has_table_privilege('service_role', 'public.record_sentiments', 'SELECT') as service_role_can_select,
  has_table_privilege('service_role', 'public.record_sentiments', 'INSERT') as service_role_can_insert,
  has_table_privilege('service_role', 'public.record_sentiments', 'UPDATE') as service_role_can_update,
  has_table_privilege('service_role', 'public.record_sentiments', 'DELETE') as service_role_can_delete;

-- ④ RLS が有効で、select ポリシーが auth.uid() = user_id になっている
-- 期待: relrowsecurity=true, 1行（record_sentiments_select_own）が select 用
select relrowsecurity
from pg_class
where oid = 'public.record_sentiments'::regclass;

select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.record_sentiments'::regclass;

-- ⑤ score の範囲 check 制約が効いている
-- 期待: 1回目は成功（0.5）、2回目は check violation で失敗する
-- （実行前に record_sentiments を参照できる records.id と auth.users.id を
--  各自の環境の実データに置き換えること。以下はプレースホルダ）
-- insert into public.record_sentiments (record_id, user_id, score, model)
--   values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 0.5, 'claude-haiku-4-5');
-- insert into public.record_sentiments (record_id, user_id, score, model)
--   values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 2.0, 'claude-haiku-4-5');
-- 後片付け:
-- delete from public.record_sentiments where record_id = '00000000-0000-0000-0000-000000000000';
