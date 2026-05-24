-- ========================================================================
-- 0005_records_column_grants.sql 適用後の検証スクリプト
-- ------------------------------------------------------------------------
-- 使い方:
--   1) Supabase ダッシュボードで対象ユーザーとしてログイン
--      （Auth → Users → 任意のユーザーで Impersonate）
--   2) SQL Editor で本ファイルを順に実行
--   3) 各セクションのコメントの「期待」と一致することを確認
--
-- このファイルは認証済ロール (authenticated) として走ることを想定。
-- service_role で実行すると全カラム更新できるので検証にならない。
-- ========================================================================

-- 事前準備: 自分の records を 1 件選んで :rid に入れる
-- （Supabase Studio SQL Editor は psql の :var 構文をサポートしないので、
--  以下の SELECT で取得した id を ②③④ に手で貼り付ける）
select id, text, marked, created_at
  from public.records
  where user_id = auth.uid()
  order by created_at desc
  limit 1;
-- → id 値をコピー。以下 '<RID>' に貼り付け。


-- ============================================================
-- ① 本文改竄が拒否されること（PRD §13「編集不可」を担保）
-- ============================================================
-- 期待: permission denied for column "text" / もしくは "0 rows affected"
update public.records
  set text = 'hacked-by-attacker'
  where id = '<RID>';

-- 念のため再取得して本文が変わっていないこと
select text from public.records where id = '<RID>';
-- → 'hacked-by-attacker' になっていないこと（変わっていない）


-- ============================================================
-- ② created_at / char_count / user_id の改竄も拒否されること
-- ============================================================
-- 期待: permission denied for column "..."
update public.records set created_at = now()             where id = '<RID>';
update public.records set char_count = 0                 where id = '<RID>';
update public.records set user_id    = gen_random_uuid() where id = '<RID>';


-- ============================================================
-- ③ marked のトグルだけは通ること（MARK 仕様）
-- ============================================================
-- 期待: UPDATE 1 → marked が反転している
update public.records set marked = true  where id = '<RID>';
select marked from public.records where id = '<RID>';   -- → true

update public.records set marked = false where id = '<RID>';
select marked from public.records where id = '<RID>';   -- → false


-- ============================================================
-- ④ marked=true で INSERT しても DB 上は false になること
-- ============================================================
-- GRANT INSERT は (user_id, text, char_count) のみなので、marked は DEFAULT (false) を強制される。
-- 期待: returning marked → false
insert into public.records (user_id, text, char_count, marked)
  values (auth.uid(), 'verify insert', 13, true)
  returning id, marked;

-- ↑ で returning した id を使って後始末（任意。テストデータを消したい場合）
-- 注: DELETE は RLS ポリシーが無いので普通の authenticated では消せない。
--     service_role で実行するか、本番では「テスト投稿が 1 件残る」と割り切る。


-- ============================================================
-- ⑤ 他人の record に手出しできないこと（RLS row レベル）
-- ============================================================
-- 期待: 0 rows affected （RLS で行が見えない）
update public.records
  set marked = true
  where user_id <> auth.uid();
-- → "UPDATE 0"


-- ========================================================================
-- 全項目クリアなら 0005 適用 OK。
-- ロールバックが必要な場合は supabase/verify/0005_rollback.sql を参照。
-- ========================================================================
