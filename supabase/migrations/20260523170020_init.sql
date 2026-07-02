-- profiles（auth.users と 1:1）
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  fruit_emoji text,
  created_at timestamptz not null default now()
);

-- records（投稿。編集・削除不可）
create table public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  char_count int not null,
  created_at timestamptz not null default now()
);

create index records_user_id_created_at_idx
  on public.records (user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.records  enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- records: 参照・作成のみ。UPDATE / DELETE ポリシーなし（投稿は編集・削除不可）
create policy "records_select_own" on public.records
  for select using (auth.uid() = user_id);

create policy "records_insert_own" on public.records
  for insert with check (auth.uid() = user_id);

-- サインアップ時に profiles を自動生成するトリガー
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
