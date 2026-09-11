-- ============================================================
-- SciTech Learning — Supabase schema
-- รันไฟล์นี้ใน Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.app_state (
  id         text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- แอปใช้ anon key อ่าน/เขียนโดยตรง (ระบบผู้ใช้อยู่ในแอปเอง)
alter table public.app_state enable row level security;

drop policy if exists "app_state anon read" on public.app_state;
create policy "app_state anon read"
  on public.app_state for select
  to anon
  using (true);

drop policy if exists "app_state anon write" on public.app_state;
create policy "app_state anon write"
  on public.app_state for insert
  to anon
  with check (true);

drop policy if exists "app_state anon update" on public.app_state;
create policy "app_state anon update"
  on public.app_state for update
  to anon
  using (true)
  with check (true);
