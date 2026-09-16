-- ============================================================
-- SciTech Learning — Phase 1: ตารางข้อมูลจริงต่อเรกคอร์ด (per-record)
-- รันไฟล์นี้ใน Supabase Dashboard → SQL Editor → New query → Run
-- (หรือ: node scripts/run-schema-records.mjs <PERSONAL_ACCESS_TOKEN sbp_...>)
-- ============================================================
-- ทดแทนการเก็บข้อมูลเป็น JSON blob เดียวใน app_state
--   เดิม: แถวเดียว id='scitech_worksheet_submissions' / 'scitech_attendance_records'
--         → อุปกรณ์สองเครื่องเขียนทับกันทั้งชุด (สาเหตุ "บทเรียน/คะแนนหาย")
--   ใหม่: 1 เรกคอร์ด = 1 แถวจริง → เครื่องอื่นเขียนเรกคอร์ดอื่นไม่มีวันทับกัน
--
-- การใช้งานหลังรันสคริปต์นี้: แอปจะ
--   1. backfill — อ่านข้อมูลเดิมจาก app_state ยัดเข้าตารางใหม่ครั้งเดียว (idempotent)
--   2. เขียน/อ่านตารางใหม่จากนั้นเป็นต้นไป (localStorage เหลือเป็น cache ออฟไลน์)
--
-- RLS: โปรเจกต์นี้ยังใช้ anon key เขียนตรง (เหมือน app_state ปัจจุบัน —
-- ตรวจแล้วด้วย probe ว่า anon อ่าน/เขียน app_state ได้จริง) จึงเปิดสิทธิ์
-- anon+authenticated ให้เท่ากัน แต่ "กันข้อมูลเสียด้วย constraint" แทน:
--   • คำตอบซ้ำ (worksheet, student) เดียวกัน → upsert แทนที่ (ไม่ซ้ำแถว)
--   • เช็คชื่อซ้ำ (session, student) เดียวกัน → upsert แทนที่
-- เมื่ออนาคตรัน supabase/schema-auth.sql แล้ว ให้เปลี่ยนนโยบายตารางนี้เป็น
-- "นักเรียนแก้ได้เฉพาะแถวตัวเอง, ครูเขียนได้ทุกแถว" — รายละเอียดอยู่ท้ายไฟล์
-- ============================================================

-- ---------- ตารางคำตอบใบงาน (แทน key scitech_worksheet_submissions) ----------
create table if not exists public.worksheet_submissions (
  id           uuid primary key default gen_random_uuid(),
  legacy_id    integer,                -- id ตัวเลขเดิมจาก localStorage (แถวใหม่ = null)
  worksheet_id integer not null,
  student_id   integer not null,
  answers      jsonb not null default '[]'::jsonb,
  -- แอปเก็บวันที่เป็น "ข้อความแสดงผล" (เช่น 15/09/2568 19:01) ไม่ใช่ ISO —
  -- ใช้ text เพื่อรับค่าเดิมได้ทันที (เวลาจริงมี created_at/updated_at แล้ว)
  submitted_at text not null default '',
  is_late      boolean not null default false,
  status       text not null default 'submitted',   -- 'submitted' | 'graded'
  total_score  numeric,
  graded_at    text,
  graded_by    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint submissions_status_check check (status in ('submitted','graded'))
);

-- คำตอบหนึ่งชิ้นต่อ (ใบงาน, นักเรียน) หนึ่งแถว — ส่งซ้ำ = ทับแถวเดิม (เหมือน server/index.js เดิม)
create unique index if not exists submissions_ws_student_uniq
  on public.worksheet_submissions (worksheet_id, student_id);
-- id ตัวเลขเดิมต้องไม่ซ้ำกันเอง (แถวใหม่ legacy_id=null ไม่เข้ากฎนี้)
create unique index if not exists submissions_legacy_id_uniq
  on public.worksheet_submissions (legacy_id) where legacy_id is not null;

-- ---------- ตารางเช็คชื่อ (แทน key scitech_attendance_records) ----------
create table if not exists public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  legacy_id     integer,               -- id ตัวเลขเดิมจาก localStorage
  session_id    integer not null,      -- อ้าง scitech_attendance_sessions (ยังเป็น blob ใน Phase 1)
  student_id    integer not null,
  student_name  text not null default '',
  grade_level   integer not null default 1,
  status        text not null default 'present',  -- 'present' | 'absent' | 'late' | 'leave'
  checked_in_at text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint attendance_status_check check (status in ('present','absent','late','leave'))
);

-- เช็คชื่อหนึ่งคนต่อเซสชันหนึ่งแถว (เหมือนกติกา addRecord เดิม)
create unique index if not exists attendance_session_student_uniq
  on public.attendance_records (session_id, student_id);
create unique index if not exists attendance_legacy_id_uniq
  on public.attendance_records (legacy_id) where legacy_id is not null;

-- ---------- updated_at อัตโนมัติ ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists submissions_touch on public.worksheet_submissions;
create trigger submissions_touch
  before update on public.worksheet_submissions
  for each row execute function public.touch_updated_at();

drop trigger if exists attendance_touch on public.attendance_records;
create trigger attendance_touch
  before update on public.attendance_records
  for each row execute function public.touch_updated_at();

-- ---------- RLS แบบเปิดเท่า app_state ปัจจุบัน (โปรเจกต์ยังใช้ anon เขียนตรง) ----------
alter table public.worksheet_submissions enable row level security;
alter table public.attendance_records   enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['worksheet_submissions','attendance_records'] loop
    execute format('drop policy if exists %I on public.%I', t||'_anon_all', t);
    execute format($f$
      create policy %I on public.%I for all
      to anon, authenticated
      using (true) with check (true)
    $f$, t||'_anon_all', t);
  end loop;
end $$;

-- ---------- Realtime: ครูตรวจคะแนน/นักเรียนส่งงาน → ทุกเครื่องเห็นทันที ----------
-- (แทนการ poll ทุก 5 วินาทีของกลไก blob เดิม)
-- รันซ้ำได้: ถ้าตารางอยู่ใน publication แล้ว ข้าม (ให้ผ่านโดยไม่ error)
do $$
begin
  alter publication supabase_realtime add table public.worksheet_submissions;
exception when others then null; -- already member
end $$;
do $$
begin
  alter publication supabase_realtime add table public.attendance_records;
exception when others then null; -- already member
end $$;

-- ให้สิทธิ์ตารางตรง ๆ ด้วย (RLS ทำงานร่วมกับ grant)
grant select, insert, update, delete on public.worksheet_submissions to anon, authenticated;
grant select, insert, update, delete on public.attendance_records   to anon, authenticated;

-- ============================================================
-- (อนาคต) เมื่อรัน supabase/schema-auth.sql แล้ว ให้แทนนโยบายด้านบนด้วย:
--
--   drop policy "worksheet_submissions_anon_all" on public.worksheet_submissions;
--   create policy "ws read all"  on public.worksheet_submissions for select
--     to authenticated using (true);
--   create policy "ws insert own" on public.worksheet_submissions for insert
--     to authenticated with check (student_id = (auth.jwt() -> 'user_metadata' ->> 'register_id')::int
--                                  or public.is_admin());
--   create policy "ws update"     on public.worksheet_submissions for update
--     to authenticated using (true) with check (public.is_admin()
--       or student_id = (auth.jwt() -> 'user_metadata' ->> 'register_id')::int);
--   -- ทำแบบเดียวกันกับ attendance_records (เขียนได้เฉพาะแถวตัวเอง/admin)
--
-- และต้องเพิ่มชื่อตารางใหม่ทั้งสองเข้า is_student_writable_key() ไม่ได้แล้ว
-- เพราะระบบเปลี่ยนจาก "คีย์" เป็น "แถวจริง" — ลบฟังก์ชันนั้นทิ้งได้ในระยะถัดไป
-- ============================================================
