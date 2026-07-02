-- #82: themes API の Anthropic 失敗を short-TTL negative cache する
--
-- これまで Anthropic 呼び出し失敗（502 等）はキャッシュされず、
-- ユーザーがリロードするたびに Claude を再呼び出ししていた → 課金の積算リスク。
-- theme_cache に error 列を追加し、失敗時も `themes = '[]', error = <reason>` で保存。
-- 読み込み側で `error IS NOT NULL AND generated_at > now() - 5min` ならキャッシュヒット扱い。
--
-- 既存行は error = NULL のままで挙動変わらず（後方互換）。

alter table public.theme_cache
  add column error text;

-- column は authenticated に SELECT 公開してよい（自分の失敗理由が見える程度の情報）。
-- すでに theme_cache 全体に SELECT GRANT があるので追加 GRANT は不要。
