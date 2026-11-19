-- Axon: per-student progress, one row per user.
-- Run once in the Supabase dashboard → SQL Editor. Safe to re-run.

create table if not exists public.axon_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.axon_progress enable row level security;

drop policy if exists "axon: read own progress"   on public.axon_progress;
drop policy if exists "axon: insert own progress" on public.axon_progress;
drop policy if exists "axon: update own progress" on public.axon_progress;
drop policy if exists "axon: delete own progress" on public.axon_progress;

create policy "axon: read own progress"   on public.axon_progress for select using (auth.uid() = user_id);
create policy "axon: insert own progress" on public.axon_progress for insert with check (auth.uid() = user_id);
create policy "axon: update own progress" on public.axon_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "axon: delete own progress" on public.axon_progress for delete using (auth.uid() = user_id);

-- Keep rows a sensible size (progress JSON is normally < 300 KB).
alter table public.axon_progress drop constraint if exists axon_progress_size;
alter table public.axon_progress add constraint axon_progress_size check (pg_column_size(data) < 2000000);
