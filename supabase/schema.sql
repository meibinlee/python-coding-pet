-- Run once in Supabase Dashboard → SQL Editor.
-- One save row per account. Row level security lets each player read and write only their own row.
create table if not exists public.pet_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  save jsonb not null check (pg_column_size(save) < 100000),
  updated_at timestamptz not null default now()
);

alter table public.pet_saves enable row level security;

drop policy if exists "read own save" on public.pet_saves;
drop policy if exists "insert own save" on public.pet_saves;
drop policy if exists "update own save" on public.pet_saves;
drop policy if exists "delete own save" on public.pet_saves;

create policy "read own save" on public.pet_saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own save" on public.pet_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own save" on public.pet_saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own save" on public.pet_saves
  for delete to authenticated using ((select auth.uid()) = user_id);
