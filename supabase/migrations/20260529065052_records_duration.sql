-- 録音時間（duration_ms）を records に保存し、総録音分数（MINUTES STATS）を集計する。
-- 既存レコードは default 0 で初期化される（過去分は推定せず 0 寄与）。

alter table public.records
  add column if not exists duration_ms int not null default 0;

-- 列単位 INSERT GRANT を拡張（0005 で user_id/text/char_count のみ許可済）。
-- authenticated ロールは duration_ms も INSERT できるようにする。marked は引き続き DEFAULT 強制。
grant insert (duration_ms) on public.records to authenticated;

-- 全件 SUM を返す RPC（0003 の get_streak と同じ security definer パターン）。
-- 100 件ページングでは合計を取れないため、サーバ側で全レコードを集計する。
create or replace function public.get_total_duration_ms()
returns bigint
language sql
security definer set search_path = ''
stable
as $$
  select coalesce(sum(duration_ms), 0)::bigint
  from public.records
  where user_id = auth.uid();
$$;

grant execute on function public.get_total_duration_ms() to authenticated;
