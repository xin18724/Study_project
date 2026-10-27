-- Run this file in Supabase Dashboard → SQL Editor.
create table if not exists public.word_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id text not null,
  status text not null default 'unmastered'
    check (status in ('unmastered', 'learning', 'mastered', 'unfamiliar')),
  mastery_level smallint not null default 0 check (mastery_level between 0 and 3),
  next_review_date date,
  is_mastered boolean not null default false,
  is_unfamiliar boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table if not exists public.daily_word_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  word_id text not null,
  record_date date not null,
  response text check (response in ('mastered', 'review')),
  unknown_count smallint not null default 0 check (unknown_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id, record_date)
);

alter table public.word_progress enable row level security;
alter table public.daily_word_records enable row level security;

revoke all on public.word_progress, public.daily_word_records from anon;
grant select, insert, update, delete on public.word_progress, public.daily_word_records to authenticated;

drop policy if exists "Users manage their own word progress" on public.word_progress;
create policy "Users manage their own word progress"
  on public.word_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own daily word records" on public.daily_word_records;
create policy "Users manage their own daily word records"
  on public.daily_word_records for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
