-- #レポート生成の非同期化：MONTH の生成が Vercel serverless の maxDuration(60s) を
-- 超えてタイムアウトし、しかも Claude 応答前に kill されるので何もキャッシュされず
-- 毎回同じ失敗を繰り返す問題への根本対応。
--
-- POST は即座に 202 を返し、実際の Claude 生成は waitUntil でレスポンス後もバックグラウンド
-- 継続する（app/api/reports/[periodKey]/route.ts）。report_jobs はその進行状況を
-- クライアントがポーリングで確認するための状態テーブル。生成成功時は行を削除し
-- （完了の判定は reports テーブルの存在そのもの）、失敗時のみ status='failed' で残す。
--
-- RLS: 本人の行のみ SELECT 可。書き込みは service_role のみ（theme_cache と同じパターン）。

create table public.report_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  status text not null default 'pending', -- 'pending' | 'failed'
  error text,
  started_at timestamptz not null default now(),
  primary key (user_id, period_key)
);

alter table public.report_jobs enable row level security;

create policy "report_jobs_select_own" on public.report_jobs
  for select using (auth.uid() = user_id);

-- 「Automatically expose new tables」OFF 環境向けに明示 GRANT（0012/0013 と同じ理由）。
grant select on public.report_jobs to authenticated;
grant select, insert, update, delete on public.report_jobs to service_role;
