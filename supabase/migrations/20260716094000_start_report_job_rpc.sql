-- #143: レポート生成起動の TOCTOU を原子化する。
--
-- 背景: app/api/reports/[periodKey]/route.ts POST は getReport → getReportJob →
-- startReportJob → waitUntil(runReportJob) の check-then-act。同一 periodKey への
-- 二重 POST（別タブ / 先読み生成 / 再送）で両方が「進行中ジョブ無し」を読み、両方が
-- runReportJob を起動 → Claude Sonnet を 2 回呼ぶ（upsert で最終整合は取れるがコスト 2 倍）。
--
-- start_report_job は「起動権の取得」を 1 文の条件付き upsert で原子化する：
--   - ジョブ行が無い → INSERT（起動権を取得）
--   - 既存行が failed / stale（started_at が古い）→ UPDATE で pending に更新（再起動）
--   - 既存行が fresh な pending → 何もしない（他リクエストが生成中）
-- RETURNING の有無で勝敗を判定し、true（起動権あり）/ false（既存生成に相乗り）を返す。
--
-- report_jobs は service_role からのみ書く（admin client 経由）ため EXECUTE は service_role のみ。
-- CREATE FUNCTION の PUBLIC 自動付与は剥がす（20260629070634 と同じ罠）。

create or replace function public.start_report_job(
  p_user_id uuid,
  p_period_key text,
  p_stale_ms integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_won boolean;
begin
  insert into public.report_jobs (user_id, period_key, status, error, started_at)
  values (p_user_id, p_period_key, 'pending', null, now())
  on conflict (user_id, period_key) do update
    set status = 'pending', error = null, started_at = now()
    where report_jobs.status = 'failed'
       or report_jobs.started_at < now() - make_interval(secs => p_stale_ms / 1000.0)
  returning true into v_won;

  return coalesce(v_won, false);
end;
$$;

revoke execute on function public.start_report_job(uuid, text, integer) from public;
grant execute on function public.start_report_job(uuid, text, integer) to service_role;
