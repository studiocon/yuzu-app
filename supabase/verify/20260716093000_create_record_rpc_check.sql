-- 20260716093000_create_record_rpc.sql の適用検証（Studio SQL Editor で手実行）。
-- #139: create_record RPC が存在し、EXECUTE が authenticated のみ（PUBLIC/anon には無い）ことを確認する。

-- 1) 関数が存在し SECURITY DEFINER であること
select
  p.proname,
  p.prosecdef                              as security_definer,   -- true 期待
  pg_get_function_identity_arguments(p.oid) as args               -- text, integer, integer, integer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'create_record';

-- 2) EXECUTE 権限。authenticated=true / anon=false / public(全体)=false を期待
select
  has_function_privilege('authenticated', 'public.create_record(text, integer, integer, integer)', 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon',          'public.create_record(text, integer, integer, integer)', 'EXECUTE') as anon_execute;

-- 3) grantee 一覧（authenticated のみが出るのが正。PUBLIC 行が無いこと）
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'create_record';
