-- #103 keepalive 対応の延長で発覚した致命的な GRANT 欠落の一括修正。
--
-- 背景：Supabase の新しいプロジェクトでは service_role が postgres ロールを継承していない
--      （pg_auth_members で service_role の上位ロールが空）。そのため、テーブル所有者が postgres でも
--      service_role に対する明示 GRANT がないとアクセスできない。
--      has_table_privilege で確認した結果、records / reports / theme_cache の全 DML が service_role で
--      不可になっていた。これらは lib/reports.ts と app/api/insights/themes/route.ts が
--      createAdminClient（service_role）から呼び出すため、本番でレポート生成と PATTERN キャッシュが
--      silent fail していたはず。
--
--      profiles も UPDATE が将来必要（#65 RevenueCat webhook での plan 更新）。
--      0012 で SELECT は付けたが、UPDATE も今のうちに通しておく。

-- records: 読み取りのみ（書き込みはユーザー本人 = authenticated 経由）
grant select on public.records to service_role;

-- reports: サーバが生成して保存する。SELECT/INSERT/UPDATE
grant select, insert, update on public.reports to service_role;

-- theme_cache: サーバの PATTERN キャッシュ upsert 用
grant select, insert, update on public.theme_cache to service_role;

-- profiles: 0012 で SELECT 済み。UPDATE を追加（plan 変更用）
grant update on public.profiles to service_role;
