-- MARK: ユーザーに唯一許された能動操作。本物だった、と未来の自分から過去の声へ刻印する。
-- 既存の records は marked=false で初期化。
alter table public.records
  add column if not exists marked boolean not null default false;

create index if not exists records_user_id_marked_idx
  on public.records (user_id, marked);

-- RLS: 自分の record だけ marked を更新できる。text 等は更新不可のまま。
-- update ポリシーを追加（INSERT 時の制約として marked=false のみ許可）。
drop policy if exists "records_update_mark_own" on public.records;
create policy "records_update_mark_own" on public.records
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
