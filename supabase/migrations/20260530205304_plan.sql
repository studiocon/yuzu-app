-- #102: プランロール（エンタイトルメント）土台
--
-- Free / Light / Premium の 3 段を profiles に持たせる。全員 free 既定。
-- 課金有効化（#65 Phase B / RevenueCat）の前提。Phase A（Free 先行）で先に入れておく。
--
-- ⚠️ 自己昇格防止：profiles はアプリから更新されない（identity は #NNN、nickname 等はレガシー）。
-- plan は service_role（RevenueCat webhook / admin）のみが書き込む。
-- そのため authenticated の表レベル UPDATE 権限を剥奪し、ユーザーが plan を自己改変できないようにする。

alter table public.profiles
  add column plan text not null default 'free',
  add column plan_period text,
  add column plan_renews_at timestamptz,
  add column plan_source text;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'light', 'premium'));

alter table public.profiles
  add constraint profiles_plan_period_check
  check (plan_period is null or plan_period in ('monthly', 'annual'));

-- profiles はクライアントから更新されない（確認済）。plan 含む全列の自己改変を封じる。
revoke update on public.profiles from authenticated;
