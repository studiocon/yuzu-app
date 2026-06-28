-- Supabase security advisor 対応（0028/0029: anon/authenticated が SECURITY DEFINER 関数を RPC 実行可能）。
--
-- 背景: Postgres は CREATE FUNCTION 時に EXECUTE を PUBLIC へ自動付与する。
-- そのため過去 migration が `grant execute ... to authenticated` だけを書いていても、
-- PUBLIC（anon を含む）経由で /rest/v1/rpc/<fn> を叩けてしまう。
--
-- 方針:
-- 1. 集計 RPC（get_streak / get_total_duration_ms）は PUBLIC から剥がし、authenticated だけに許可。
--    中身は auth.uid() 依存なので anon が呼んでも 0 が返るだけだが、露出面を減らす。
-- 2. トリガー専用関数（handle_new_user / rls_auto_enable）は RPC で呼ばれる理由が無い。
--    PUBLIC / anon / authenticated すべてから EXECUTE を剥がす。
--    トリガー本体は所有者権限で発火するため EXECUTE 剥奪の影響を受けない。
--
-- 冪等。本番 Supabase へ手動適用が必要（このリポジトリの migration は自動デプロイされない）。

-- ── 集計 RPC: PUBLIC から剥がして authenticated のみ ──
revoke execute on function public.get_streak() from public;
revoke execute on function public.get_total_duration_ms() from public;
grant execute on function public.get_streak() to authenticated;
grant execute on function public.get_total_duration_ms() to authenticated;

-- ── トリガー専用関数: 誰からも RPC 実行不可にする ──
revoke execute on function public.handle_new_user() from public;

-- rls_auto_enable はこのリポジトリの migration では定義していない（本番で別途作成された）。
-- 存在する場合のみ EXECUTE を剥がす（シグネチャ違いに耐えるため pg_proc 走査）。
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  loop
    execute format('revoke execute on function %s from public', fn);
  end loop;
end $$;

-- ── inquiries: 直接 INSERT の攻撃面を塞ぐ（advisor 0024: permissive RLS）──
-- /api/inquiries は service_role（admin client）経由で INSERT する。0010 が anon/authenticated に
-- 付けた列レベル INSERT 権限と `with check (true)` ポリシーはアプリから一度も使われておらず、
-- /rest/v1/inquiries への直接 POST で API 層のレート制限（lib/inquiries.ts）を迂回できる穴になる。
-- INSERT は API 経由（service_role）に一本化し、クライアントからの直接書き込みを禁止する。
drop policy if exists "inquiries_insert_any" on public.inquiries;
revoke insert on public.inquiries from anon, authenticated;
-- select_own ポリシー（自分の問い合わせ履歴 UI 用）と authenticated の SELECT 権限は維持する。
