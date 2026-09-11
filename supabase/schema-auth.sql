-- ============================================================
-- SciTech Learning — Secure schema: Supabase Auth + RLS
-- รันไฟล์นี้ใน Supabase Dashboard → SQL Editor → New query → Run
-- (แทนที่นโยบายเดิมที่เปิดให้ anon เขียนได้ทั้งตาราง)
-- ============================================================
-- โมเดลสิทธิ์:
--   • authenticated (ล็อกอินผ่าน Supabase Auth) → อ่านได้ทุกแถว
--     (นักเรียนต้องอ่านบทเรียน ข้อสอบ ประกาศ ใบงาน)
--   • admin เท่านั้น → เขียนได้ทุกแถว
--     (จำแนกจาก user_metadata.role = 'admin' ใน JWT)
--   • นักเรียน (authenticated ที่ไม่ใช่ admin) → เขียนได้เฉพาะคีย์
--     "ฝั่งนักเรียน" ที่ระบบต้องการ (เช็คชื่อ, ส่งใบงาน, ความคืบหน้า,
--     ภารกิจ, ประวัติทำข้อสอบ) — เพราะแอปเก็บเป็นคีย์รวมตารางเดียว
--   • anon (ไม่ล็อกอิน) → อ่าน/เขียนไม่ได้เลย
--
-- การสร้างบัญชี: admin สร้างผู้ใช้ผ่านแอป → แอปเรียก
-- supabase.auth.admin ไม่ได้จากเบราว์เซอร์ จึงใช้วิธี: admin
-- ล็อกอินค้างไว้ แล้วเรียก RPC ที่อนุญาตให้เฉพาะ admin
-- สร้าง/แก้ไขบัญชีผ่านฟังก์ชัน security definer
-- ============================================================

-- 1) ตารางสิทธิ์ admin — อยู่ฝั่งเซิร์ฟเวอร์ล้วน ๆ
--    (อย่าเชื่อ metadata ใน JWT เพราะใครก็สมัครบัญชีใหม่พร้อม metadata ปลอมได้)
create table if not exists public.app_admins (
  email text primary key
);
alter table public.app_admins enable row level security;
-- ไม่มีนโยบายใด ๆ = อ่าน/เขียนไม่ได้จากภายนอก (เข้าถึงผ่านฟังก์ชัน security definer เท่านั้น)

-- ใส่บัญชี admin เริ่มต้น (ครั้งแรก)
insert into public.app_admins (email)
values ('admin@scitech.local')
on conflict (email) do nothing;

-- ฟังก์ชันช่วย: ผู้ใช้ปัจจุบันเป็น admin หรือไม่ (เช็คตารางสิทธิ์)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'email', ''))
  );
$$;

-- 2) คีย์ที่นักเรียนต้องเขียนได้ (ระบบเรียน/เช็คชื่อ/ส่งงาน/ประวัติ)
create or replace function public.is_student_writable_key(k text)
returns boolean
language sql
stable
as $$
  select k in (
    'scitech_attendance_records',
    'scitech_worksheet_submissions',
    'scitech_lesson_progress',
    'scitech_mission_completions',
    'scitech_lesson_sessions',
    'onet_exam_history_v1',
    'm1_exam_history_v1'
  );
$$;

-- 3) ลบนโยบายเดิม (anon เขียนได้ทั้งตาราง) แล้ววางนโยบายใหม่
drop policy if exists "app_state anon read"   on public.app_state;
drop policy if exists "app_state anon write"  on public.app_state;
drop policy if exists "app_state anon update" on public.app_state;

drop policy if exists "app_state auth read"        on public.app_state;
drop policy if exists "app_state admin write"      on public.app_state;
drop policy if exists "app_state admin update"     on public.app_state;
drop policy if exists "app_state student insert"   on public.app_state;
drop policy if exists "app_state student update"   on public.app_state;

create policy "app_state auth read"
  on public.app_state for select
  to authenticated
  using (true);

create policy "app_state admin write"
  on public.app_state for insert
  to authenticated
  with check (public.is_admin());

create policy "app_state admin update"
  on public.app_state for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "app_state student insert"
  on public.app_state for insert
  to authenticated
  with check (public.is_student_writable_key(id));

create policy "app_state student update"
  on public.app_state for update
  to authenticated
  using (public.is_student_writable_key(id))
  with check (public.is_student_writable_key(id));

-- 4) ฟังก์ชันจัดการบัญชี (เฉพาะ admin เรียกได้) — สร้างบัญชีใหม่
--    เก็บรหัสผ่านเป็น bcrypt ในระบบ auth ของ Supabase โดยอัตโนมัติ
create or replace function public.admin_create_user(
  p_username text,
  p_password text,
  p_full_name text,
  p_role text,
  p_grade_level int default null,
  p_class_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_username)) || '@scitech.local';
begin
  if not public.is_admin() then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น';
  end if;
  if length(p_password) < 6 then
    raise exception 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', lower(trim(p_username)), 'role', p_role,
                       'full_name', p_full_name,
                       'grade_level', p_grade_level, 'class_name', p_class_name)
  )
  on conflict (email) do update
    set raw_user_meta_data = excluded.raw_user_meta_data,
        updated_at = now()
    -- หมายเหตุ: ไม่แตะ encrypted_password ของบัญชีที่มีอยู่แล้ว
    -- (กัน RPC ลบรหัสผ่านเดิมทิ้งโดยไม่ตั้งใจ) — ใช้ admin_set_password แทน
  returning id into v_id;

  -- ให้สิทธิ์ admin ทำงานผ่านตารางเท่านั้น (ตาม role ที่ admin ตั้ง)
  if p_role in ('admin','teacher') then
    insert into public.app_admins (email) values (v_email)
    on conflict (email) do nothing;
  end if;

  return v_id;
end;
$$;

grant execute on function public.admin_create_user(text, text, text, text, int, text) to authenticated;

-- 6ก) admin เพิ่ม/ถอดสิทธิ์ admin ให้บัญชีอื่น (เฉพาะ admin)
create or replace function public.admin_grant(p_username text, p_make_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_username)) || '@scitech.local';
begin
  if not public.is_admin() then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น';
  end if;
  if p_make_admin then
    insert into public.app_admins (email) values (v_email)
    on conflict (email) do nothing;
  else
    delete from public.app_admins where email = v_email;
  end if;
end;
$$;
grant execute on function public.admin_grant(text, boolean) to authenticated;

-- 5) ฟังก์ชันเปลี่ยนรหัสผ่านบัญชีอื่น (เฉพาะ admin) / ของตัวเอง
create or replace function public.admin_set_password(
  p_username text,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_username)) || '@scitech.local';
  v_caller_email text := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');
begin
  -- ตัวเองเปลี่ยนรหัสตัวเองได้; แก้ของคนอื่นต้องเป็น admin
  if v_email <> lower(trim(v_caller_email)) and not public.is_admin() then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น';
  end if;
  if length(p_new_password) < 6 then
    raise exception 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where lower(auth.users.email) = v_email;
  if not found then
    raise exception 'ไม่พบบัญชี % ในระบบ auth — admin ต้องสร้างใหม่ผ่านหน้าจัดการผู้ใช้', p_username;
  end if;
end;
$$;

grant execute on function public.admin_set_password(text, text) to authenticated;

-- 6) ปิดสิทธิ์ตรง ๆ ของ anon ที่เหลือ (กันเผื่อ)
revoke all on public.app_state from anon;
grant  select on public.app_state to authenticated;

-- 7) ยกเลิกการเก็บรหัสผ่านใน app_state (ครั้งเดียว):
--    แอปจะ backfill บัญชีทั้งหมดเข้าระบบ auth ก่อน แล้วจึงเคลียร์
--    คอลัมน์ password ในแถว scitech_users ออกทั้งหมด

-- 8) ฟังก์ชัน is_admin() แบบเรียกจากแอปได้ (RPC)
create or replace function public.is_admin_rpc()
returns boolean
language sql
stable
as $$
  select public.is_admin();
$$;
grant execute on function public.is_admin_rpc() to authenticated;
