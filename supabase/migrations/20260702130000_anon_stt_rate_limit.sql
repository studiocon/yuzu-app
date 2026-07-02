-- 匿名（未ログイン onboarding）STT のレート制限強化。
--
-- 背景: app/api/transcribe/route.ts の匿名パスは HttpOnly cookie（yuzu_anon_stt）
-- ベースで 1 日 ANON_DAILY_STT_LIMIT 回に制限していたが、cookie を削除するか
-- 直接 POST すれば無制限に ElevenLabs Scribe（有料・従量課金）を叩けた（#52）。
-- IP ベースのカウントを DB 側に追加し、cookie 削除だけでは突破できない防波堤を重ねる
-- （VPN/CGNAT 等で同一 IP を複数人が共有するケースには引き続き弱いが、cookie 単体よりは
-- 大きく bar が上がる）。
--
-- increment_anon_stt_usage は呼ぶたびにカウントをアトミックに +1 して結果を返す。
-- 上限判定（超えたら 429）は呼び出し側（app/api/transcribe/route.ts）で行う。
--
-- RLS: 有効化した上でポリシーは一切作らない（= anon/authenticated からは常に拒否）。
-- service_role（lib/supabase/admin.ts の admin client）は RLS をバイパスするので到達できる。

create table public.anon_stt_usage (
  ip text not null,
  date text not null, -- JST 日付（YYYY-MM-DD）。lib/period.ts jstDateString と揃える
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip, date)
);

alter table public.anon_stt_usage enable row level security;

-- 「Automatically expose new tables」OFF 環境向けに明示 GRANT（0012/0013 と同じ理由）。
-- service_role は postgres ロールを継承しないため、書き込み先テーブルには明示 GRANT が必須。
grant select, insert, update on public.anon_stt_usage to service_role;

create or replace function public.increment_anon_stt_usage(p_ip text, p_date text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.anon_stt_usage (ip, date, request_count, updated_at)
  values (p_ip, p_date, 1, now())
  on conflict (ip, date)
  do update set request_count = anon_stt_usage.request_count + 1, updated_at = now()
  returning request_count into v_count;
  return v_count;
end;
$$;

-- CREATE FUNCTION は PUBLIC に EXECUTE を自動付与する（0015/20260629070634 と同じ罠）。
-- 剥がして service_role のみに絞る（このテーブル/関数を anon/authenticated から直接叩く理由は無い）。
revoke execute on function public.increment_anon_stt_usage(text, text) from public;
grant execute on function public.increment_anon_stt_usage(text, text) to service_role;
