-- ========================================================================
-- 20260702130000_anon_stt_rate_limit.sql 適用後の検証スクリプト
-- ------------------------------------------------------------------------
-- 使い方:
--   Supabase Studio SQL Editor（service_role / owner モード）で実行し、
--   各セクションの「期待」と一致することを確認する。
-- ========================================================================

-- ① anon_stt_usage は anon/authenticated から一切触れない（RLS 有効・ポリシー無し）
-- 期待: 4項目とも false（service_role のみ RLS バイパスで到達）
select
  has_table_privilege('anon',          'public.anon_stt_usage', 'SELECT') as anon_can_select,
  has_table_privilege('anon',          'public.anon_stt_usage', 'INSERT') as anon_can_insert,
  has_table_privilege('authenticated', 'public.anon_stt_usage', 'SELECT') as authenticated_can_select,
  has_table_privilege('authenticated', 'public.anon_stt_usage', 'INSERT') as authenticated_can_insert;

-- ② service_role は読み書きできる
-- 期待: select/insert/update とも true
select
  has_table_privilege('service_role', 'public.anon_stt_usage', 'SELECT') as service_role_can_select,
  has_table_privilege('service_role', 'public.anon_stt_usage', 'INSERT') as service_role_can_insert,
  has_table_privilege('service_role', 'public.anon_stt_usage', 'UPDATE') as service_role_can_update;

-- ③ increment_anon_stt_usage は service_role のみ実行可（PUBLIC から自動付与された EXECUTE が剥がれていること）
-- 期待: anon=false, authenticated=false, service_role=true
select
  has_function_privilege('anon',          p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'increment_anon_stt_usage';

-- ④ 動作確認: 同一 IP+日付で2回呼ぶと 1 → 2 と増える
-- 期待: 1行目 request_count=1, 2行目 request_count=2
select public.increment_anon_stt_usage('203.0.113.1', '2026-01-01') as request_count;
select public.increment_anon_stt_usage('203.0.113.1', '2026-01-01') as request_count;

-- 後片付け（テストで作った行を消す）
delete from public.anon_stt_usage where ip = '203.0.113.1' and date = '2026-01-01';
