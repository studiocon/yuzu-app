-- #129: inquiries の IP レート制限フォールバック。
--
-- 背景: app/api/inquiries/route.ts の countRecent は user_id / email キーのみで
-- 直近1時間の件数を数えていた。未ログインかつ email 未入力の匿名 POST は
-- どちらのキーも持たず countRecent が常に 0 を返すため、5件/時（INQUIRY_RATE_MAX）の
-- 上限を完全に素通りできた。
--
-- 対応: inquiries に ip 列（nullable）を追加し、user_id も email も無い匿名 POST は
-- IP（lib/ip.ts の getClientIp、#142 XFF 偽装対策済み）でカウントする
-- （lib/inquiries.ts の pickInquiryRateLimitKey / app/api/inquiries/route.ts の countRecent）。
--
-- GRANT について: この列への書き込みは常に service_role（lib/supabase/admin.ts の
-- admin client）経由でのみ行われる。anon/authenticated への insert 権限は
-- 20260531083245_inquiries.sql で `grant insert (user_id, email, subject, body) on ...`
-- と列を明示指定しているため、ip 列は自動的に anon/authenticated から書き込み不可
-- のまま（新規 GRANT を足さない = 意図した制限）。service_role は同 migration で
-- テーブル全体に select/insert/update/delete が付与済みなので、追加の GRANT は不要。

alter table public.inquiries
  add column ip text;

-- レート制限クエリ（ip = ? and created_at >= ?）を高速化する。
create index inquiries_ip_created_at_idx
  on public.inquiries (ip, created_at desc)
  where ip is not null;
