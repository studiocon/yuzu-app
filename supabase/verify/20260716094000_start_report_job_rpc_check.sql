-- 20260716094000_start_report_job_rpc.sql の適用検証（Studio SQL Editor で手実行）。
-- #143: start_report_job RPC が存在し、EXECUTE が service_role のみ（PUBLIC/anon には無い）ことを確認。
-- 前提: report_jobs テーブル（20260702075418）が適用済みであること。

-- 1) 関数が存在し SECURITY DEFINER であること
select
  p.proname,
  p.prosecdef                               as security_definer, -- true 期待
  pg_get_function_identity_arguments(p.oid) as args              -- uuid, text, integer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'start_report_job';

-- 2) EXECUTE 権限。service_role=true / anon=false を期待
select
  has_function_privilege('service_role', 'public.start_report_job(uuid, text, integer)', 'EXECUTE') as service_role_execute,
  has_function_privilege('anon',         'public.start_report_job(uuid, text, integer)', 'EXECUTE') as anon_execute;

-- 3) 原子性のスモーク（任意）: 同一 (user, key) に 2 回連続で呼び、2 回目が false になること。
--    テスト後は該当行を消すこと。<uuid> は実在の auth.users.id に置き換える。
-- select public.start_report_job('<uuid>'::uuid, 'w-2099-01-04', 90000) as first_should_be_true;
-- select public.start_report_job('<uuid>'::uuid, 'w-2099-01-04', 90000) as second_should_be_false;
-- delete from public.report_jobs where user_id = '<uuid>'::uuid and period_key = 'w-2099-01-04';
