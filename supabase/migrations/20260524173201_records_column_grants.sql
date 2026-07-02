-- #37: MARK の RLS が編集禁止思想に違反する（全カラム更新可能）
-- #38: marked=true での新規作成防止
--
-- Postgres の RLS にはカラム単位の制限が無いため、GRANT/REVOKE で対処する。
-- authenticated ロールに対して:
--   - INSERT は (user_id, text, char_count) のみ許可。marked は DEFAULT (false) を強制。
--   - UPDATE は (marked) のみ許可。text / created_at 等は更新不可。
-- RLS（行レベルで「自分の行のみ」）は引き続き有効。
--
-- 検証手順は README "Database migrations / verification" 参照。

revoke insert, update on public.records from authenticated;

grant insert (user_id, text, char_count) on public.records to authenticated;
grant update (marked) on public.records to authenticated;

-- service_role はバックエンド処理（lib/supabase/admin.ts）でフル権限を保持。
-- ここでは authenticated ロールのみを絞る。
