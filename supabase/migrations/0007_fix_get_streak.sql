-- 0003 の get_streak のバグ修正 + 引数なし呼び出しへの対応。
--
-- 修正点:
-- 1. 連続判定式の誤り: 降順 row_number に対しては「日付 - rn」ではなく「日付 + rn」が
--    同一連続区間で一定になる。旧 0003 は「d - rn(desc)」で連続日でもグループが割れ、
--    常に streak=1 相当に崩壊していた。
-- 2. 引数不一致: アプリは supabase.rpc("get_streak") を引数なしで呼ぶ（app/api/records/route.ts）。
--    0003 は get_streak(uid uuid) と引数必須だったため呼び出しが解決されず 0 が返っていた。
--    get_total_duration_ms（0006）と同じく auth.uid() ベース・security definer・grant に揃える。
-- 3. security definer + 明示 grant が無く、RLS 下で集計が取れない可能性があった点も解消。
--
-- JST 固定・「今日 or 昨日まで続いていれば切れない」挙動は 0003 を踏襲する。

-- 旧シグネチャ（引数あり）は曖昧さを避けるため明示的に破棄する。
drop function if exists public.get_streak(uuid);

create or replace function public.get_streak()
returns int
language sql
security definer set search_path = ''
stable
as $$
  with daily as (
    select distinct
      (created_at at time zone 'Asia/Tokyo')::date as d
    from public.records
    where user_id = auth.uid()
  ),
  ranked as (
    select
      d,
      -- 降順では「日付 + 行番号」が同一連続区間で一定値になる（gaps-and-islands）
      d + (row_number() over (order by d desc))::int as grp
    from daily
    where d <= (now() at time zone 'Asia/Tokyo')::date
  ),
  latest_grp as (
    select grp from ranked
    where d = (now() at time zone 'Asia/Tokyo')::date
       or d = (now() at time zone 'Asia/Tokyo')::date - 1
    order by d desc
    limit 1
  )
  select coalesce(
    (select count(*)::int from ranked r, latest_grp lg where r.grp = lg.grp),
    0
  );
$$;

grant execute on function public.get_streak() to authenticated;
