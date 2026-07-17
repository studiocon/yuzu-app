-- #128: 感情スコアのサーバ側キャッシュ。
--
-- 背景: app/api/analyze-sentiment/route.ts は毎回 Claude（Haiku 4.5）に投稿本文を
-- 投げてスコアを計算していた。クライアント側 localStorage キャッシュ（lib/userClient.ts）
-- はあるが、端末を跨ぐ・キャッシュを消す・複数タブ等で同じ post を何度も再解析していた。
-- record_sentiments に write-through でスコアを永続化し、DB キャッシュヒット分は
-- Claude を叩かずに返す。
--
-- 設計方針：
--   - record_id を主キーにして 1 post = 1 スコア（再解析は upsert で上書き）
--   - user_id 列を持たせ RLS を「auth.uid() = user_id」の単純な比較にする
--     （records との JOIN より軽量・実装しやすい。挿入時に必ず records の所有者と
--     同じ user_id を書くのは呼び出し側 app/api/analyze-sentiment/route.ts の責務）
--   - 書き込みは service_role（admin client）経由のみ。authenticated には SELECT のみ許可
--   - CREATE FUNCTION は使わない（0015/20260629070634 の PUBLIC EXECUTE 自動付与の罠を
--     踏む余地が無い。プレーンテーブル + upsert のみで完結させる）

create table public.record_sentiments (
  record_id uuid primary key references public.records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.record_sentiments
  add constraint record_sentiments_score_range check (score >= -1 and score <= 1);

-- 「自分の record_sentiments だけ引きたい」問い合わせ（app/api/analyze-sentiment/route.ts の
-- .in("record_id", ids) + RLS）を高速化する。
create index record_sentiments_user_id_idx
  on public.record_sentiments (user_id);

-- RLS 有効化
alter table public.record_sentiments enable row level security;

-- 本人の行のみ参照可能。書き込みポリシーは無い（authenticated からの
-- insert/update/delete は常に拒否。service_role は RLS をバイパスするので到達できる）。
create policy "record_sentiments_select_own" on public.record_sentiments
  for select using (auth.uid() = user_id);

-- 「Automatically expose new tables」OFF 環境向けに明示 GRANT（CLAUDE.md の GRANT の罠）。
-- authenticated は SELECT のみ（RLS と二重に絞る）。DML は与えない。
grant select on public.record_sentiments to authenticated;

-- service_role は postgres ロールを継承しないため、書き込み先テーブルには明示 GRANT が必須
-- （0012/0013 で records/reports/theme_cache/profiles を踏んだのと同じ罠）。
grant select, insert, update, delete on public.record_sentiments to service_role;
