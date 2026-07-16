-- #139: 1 日録音上限の TOCTOU（check-then-insert 競合）を DB 側で原子化する。
--
-- 背景: app/api/records/route.ts の POST は「当日件数を数える → 上限未満なら insert」を
-- 別々のクエリで行っていた。二重タップ / クライアント再送 / 2 端末同時 POST では両方が
-- todayBefore=0 を読み、両方 insert 成功 → 無料枠「1 日 1 回」が普通の競合で破られる。
-- Supabase JS クライアントは check と insert を単一トランザクションに束ねられない
-- （PostgREST は呼び出しごとに別トランザクション）ため、アプリ層だけでは原子化できない。
-- records は「投稿は編集・削除不可」invariant のため DELETE ポリシー/GRANT が無く、
-- 「insert 後にロールバック」も採れない。よって count+insert を 1 関数（=1 トランザクション）に
-- まとめ、ユーザー単位の advisory lock で直列化する。
--
-- 認証: SECURITY DEFINER で owner 権限として走るが、user_id は必ず auth.uid() を使う
-- （引数で受け取らない）。未ログインは例外。
-- 上限: p_max_daily が null のときは無制限（admin バイパス）。呼び出し側 route が
-- entitlements から解決した値を渡す。
--
-- CREATE FUNCTION は PUBLIC に EXECUTE を自動付与する（20260629070634 と同じ罠）ので
-- 剥がして authenticated のみに絞る。

create or replace function public.create_record(
  p_text text,
  p_char_count integer,
  p_duration_ms integer,
  p_max_daily integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_since timestamptz;
  v_count integer;
  v_row public.records;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- JST 当日 00:00 の instant（lib/period.ts jstMidnightIso と同義）
  v_since := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';

  -- 同一ユーザーの check+insert を直列化（トランザクション終了で自動解放）
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select count(*) into v_count
  from public.records
  where user_id = v_uid and created_at >= v_since;

  if p_max_daily is not null and v_count >= p_max_daily then
    return jsonb_build_object('status', 'daily_limit', 'today_count', v_count);
  end if;

  insert into public.records (user_id, text, char_count, duration_ms)
  values (v_uid, p_text, p_char_count, p_duration_ms)
  returning * into v_row;

  -- today_count は insert 後の当日件数（応答の残数表示用）
  return jsonb_build_object('status', 'ok', 'record', to_jsonb(v_row), 'today_count', v_count + 1);
end;
$$;

revoke execute on function public.create_record(text, integer, integer, integer) from public;
grant execute on function public.create_record(text, integer, integer, integer) to authenticated;
