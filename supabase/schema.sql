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

-- Ranking (2026-11-24): top 5 growing pets, readable by everyone (also before login).
-- Returns only the login ID and pet name; every other save stays private under RLS.
-- Score = pets raised × 50 + current study streak × 5 + correct answers in the last 7 Korean days
-- (same weights as RANKING_WEIGHTS in src/game/activity.js). Values are read defensively and
-- capped so one broken or edited save cannot break or take over the list.
create or replace function public.pet_ranking()
returns table (rank int, username text, pet_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'Asia/Seoul')::date as d
  ), scored as (
    select
      coalesce(nullif(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1)) as username,
      left(s.save->>'petName', 20) as pet_name,
      s.updated_at,
      1 + case when jsonb_typeof(s.save->'graduates') = 'array'
               then least(jsonb_array_length(s.save->'graduates'), 2) else 0 end as pets,
      case when jsonb_typeof(s.save->'streak'->'count') = 'number'
            and (s.save->'streak'->>'lastDate') ~ '^\d{4}-\d{2}-\d{2}$'
            and ((s.save->'streak'->>'lastDate') >= to_char(t.d - 1, 'YYYY-MM-DD')
                 or jsonb_typeof(s.save->'vacation'->'startedAt') = 'string')
            and (s.save->'streak'->>'lastDate') <= to_char(t.d, 'YYYY-MM-DD')
           then least(greatest(floor((s.save->'streak'->>'count')::numeric), 0), 366)::int else 0 end as streak,
      coalesce((
        select sum(least(greatest(floor(a.value::numeric), 0), 43))::int
        from jsonb_each(case when jsonb_typeof(s.save->'activity') = 'object' then s.save->'activity' else '{}'::jsonb end) a
        where jsonb_typeof(a.value) = 'number'
          and a.key ~ '^\d{4}-\d{2}-\d{2}$'
          and a.key between to_char(t.d - 6, 'YYYY-MM-DD') and to_char(t.d, 'YYYY-MM-DD')
      ), 0) as recent
    from public.pet_saves s
    join auth.users u on u.id = s.user_id
    cross join today t
    where jsonb_typeof(s.save->'characterId') = 'string'
      and coalesce(trim(s.save->>'petName'), '') <> ''
  )
  select (row_number() over (order by pets * 50 + streak * 5 + recent desc, recent desc, updated_at desc))::int,
         username, pet_name
  from scored
  order by 1
  limit 5;
$$;

revoke all on function public.pet_ranking() from public;
grant execute on function public.pet_ranking() to anon, authenticated;
