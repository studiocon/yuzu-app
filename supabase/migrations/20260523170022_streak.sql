-- JST 基準の連続投稿日数を返す RPC 関数
-- 今日または昨日まで続く連続日数を数える（今日まだ投稿していなくてもストリークが切れない）
create or replace function public.get_streak(uid uuid)
returns int
language sql
stable
as $$
  with daily as (
    select distinct
      (created_at at time zone 'Asia/Tokyo')::date as d
    from public.records
    where user_id = uid
  ),
  ranked as (
    select
      d,
      d - (row_number() over (order by d desc))::int as grp
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
