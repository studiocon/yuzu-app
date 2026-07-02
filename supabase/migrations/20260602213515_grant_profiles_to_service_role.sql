-- #113 / #103 keepalive：service_role が profiles を SELECT できるように GRANT。
--
-- 背景：Supabase の最近のセキュリティ強化で「Automatically expose new tables」が OFF の場合、
-- profiles のような auth-mirror テーブルは service_role に対しても明示的な GRANT が必要。
-- 0009_plan.sql で profiles に plan カラムを足したが、SELECT 権限は触っていなかったため、
-- /api/health の keepalive クエリが `permission denied for table profiles` (42501) で 503 を返していた。
--
-- service_role は RLS をバイパスするが、SQL レベルの GRANT には従う。
-- ここでは keepalive とサーバ用途のため SELECT のみ付与。書き込みは引き続き authenticated 拒否のまま。

grant select on public.profiles to service_role;
