-- 管理者ロール（開発モード = 上限バイパス / モックモードの前提）。
-- 書き込みは service_role のみ（20260530205304 で authenticated の UPDATE は剥奪済み → 自己昇格不可）。
alter table public.profiles add column role text not null default 'user';
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

update public.profiles
  set role = 'admin'
  where id = '77b34a5f-bf3e-40de-902e-fa8a07c0b084';

-- #130 同乗: v2 の identity 廃止（#NNN のみ）以降未使用の列を削除
-- （handle_new_user は (id) のみ INSERT のため影響なし）
alter table public.profiles drop column if exists nickname;
alter table public.profiles drop column if exists fruit_emoji;
