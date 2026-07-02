-- reports（AI 生成レポートのキャッシュ）
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,        -- 例: "2025-05-week-21"
  kind text not null,              -- "week" | "month"
  range_start timestamptz not null,
  range_end timestamptz not null,
  payload jsonb not null,          -- ReportPayload（JSON）
  generated_at timestamptz not null default now(),
  model text not null,
  unique (user_id, period_key)
);

create index reports_user_id_range_end_idx
  on public.reports (user_id, range_end desc);

alter table public.reports enable row level security;

create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);
-- UPDATE / DELETE ポリシーなし
