-- ========================================================================
-- 0015_revoke_public_function_execute.sql 適用後の検証スクリプト
-- ------------------------------------------------------------------------
-- 使い方:
--   Supabase Studio SQL Editor（service_role / owner モード）で実行し、
--   各セクションの「期待」と一致することを確認する。
-- ========================================================================

-- ① 集計 RPC は anon から実行不可、authenticated からは実行可
-- 期待: get_streak / get_total_duration_ms とも anon=false, authenticated=true
select
  p.proname,
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_streak', 'get_total_duration_ms')
order by p.proname;

-- ② トリガー専用関数は誰からも RPC 実行不可
-- 期待: handle_new_user / rls_auto_enable とも anon=false, authenticated=false
select
  p.proname,
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('handle_new_user', 'rls_auto_enable')
order by p.proname;

-- ③ サインアップ（handle_new_user トリガー）は EXECUTE 剥奪後も発火すること
-- 期待: トリガーが残存している（tgenabled = 'O' = enabled）
select tgname, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- ④ inquiries への直接 INSERT 権限が剥がれていること
-- 期待: anon=false, authenticated=false（INSERT は /api/inquiries の service_role 経由のみ）
select
  has_table_privilege('anon',          'public.inquiries', 'INSERT') as anon_can_insert,
  has_table_privilege('authenticated', 'public.inquiries', 'INSERT') as authenticated_can_insert,
  has_table_privilege('service_role',  'public.inquiries', 'INSERT') as service_role_can_insert;

-- ⑤ inquiries の permissive INSERT ポリシーが削除されていること
-- 期待: 0 rows（inquiries_insert_any が存在しない）
select policyname, cmd, with_check
from pg_policies
where schemaname = 'public' and tablename = 'inquiries' and cmd = 'INSERT';

-- ⑥ authenticated の SELECT（自分の問い合わせ履歴 UI 用）は維持されていること
-- 期待: authenticated=true
select has_table_privilege('authenticated', 'public.inquiries', 'SELECT') as authenticated_can_select;
