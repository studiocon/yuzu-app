-- ========================================================================
-- 0005_records_column_grants.sql のロールバック（緊急時のみ実行）
-- ------------------------------------------------------------------------
-- 使用シナリオ:
--   - 本番デプロイ後にクライアントが想定外の理由で書き込みできなくなった
--   - GRANT 制約により正規の更新が止まり、サービスが破綻している
--
-- 本ロールバックを実行すると **編集禁止の思想ガード（PRD §13）が外れる**。
-- 一時的な緊急回避としてのみ使用し、原因究明後に 0005 を再適用すること。
--
-- 実行者: service_role（owner）。SQL Editor の "service_role" モードで実行。
-- ========================================================================

-- カラム単位 GRANT を一旦解除し、テーブル全体に INSERT/UPDATE を許可する
revoke insert (user_id, text, char_count) on public.records from authenticated;
revoke update (marked)                    on public.records from authenticated;

grant insert on public.records to authenticated;
grant update on public.records to authenticated;

-- ※ RLS ポリシー (records_select_own / records_insert_own / records_update_mark_own)
--    は 0004 のままなので別途撤去は不要。
--
-- 復旧後、原因を直したら必ず 0005 を再適用すること:
--   psql ... < supabase/migrations/0005_records_column_grants.sql
